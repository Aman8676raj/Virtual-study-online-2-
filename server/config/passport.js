const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Only initialize Google Strategy if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID?.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
        callbackURL: "/api/auth/google/callback",
        proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
        console.log('[Passport] Strategy Callback Invoked', { profileId: profile.id });
        try {
            // Check if user already exists
            const existingUser = await User.findOne({ googleId: profile.id });

            if (existingUser) {
                return done(null, existingUser);
            }

            // Check if user with same email exists
            const existingEmailUser = await User.findOne({ email: profile.emails[0].value });

            if (existingEmailUser) {
                // Link googleId to existing user
                existingEmailUser.googleId = profile.id;
                await existingEmailUser.save();
                return done(null, existingEmailUser);
            }

            // Create new user
            let username = profile.displayName;
            let user = await User.findOne({ username });

            // If username exists, append a random number
            if (user) {
                username = `${username} ${Math.floor(1000 + Math.random() * 9000)}`;
            }

            const newUser = new User({
                googleId: profile.id,
                username: username,
                email: profile.emails[0].value
            });

            await newUser.save();
            done(null, newUser);
        } catch (err) {
            done(err, null);
        }
    }
    ));
} else {
    console.warn('⚠️  Google OAuth credentials not configured. Google authentication will be disabled.');
}

// Serialize/Deserialize if using sessions (optional for JWT only but good practice)
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then(user => {
        done(null, user);
    });
});
