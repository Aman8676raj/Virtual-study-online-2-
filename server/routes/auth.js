const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        res.status(201).json({ result: newUser, token });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[Auth] Login attempt for: ${email}`);

        const existingUser = await User.findOne({ email });
        if (!existingUser) {
            console.log(`[Auth] User not found: ${email}`);
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordCorrect) {
            console.log(`[Auth] Invalid password for: ${email}`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        console.log(`[Auth] Login success for: ${email}`);
        res.status(200).json({ result: existingUser, token });
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ message: 'Something went wrong' });
    }
});

// Google Auth
const passport = require('passport');

router.get('/google', (req, res, next) => {
    // Check if Google credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || 
        process.env.GOOGLE_CLIENT_ID === 'your_google_client_id_here' ||
        process.env.GOOGLE_CLIENT_SECRET === 'your_google_client_secret_here') {
        const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_not_configured&message=${encodeURIComponent('Google OAuth is not configured. Please use email/password login.')}`;
        return res.redirect(redirectUrl);
    }
    console.log('[Auth] Initiating Google Auth');
    next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) {
            console.error('[Auth] Google Auth Error:', err);
            const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed&message=${encodeURIComponent(err.message)}`;
            return res.redirect(redirectUrl);
        }

        if (!user) {
            console.error('[Auth] No user returned from strategy');
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=no_user`);
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}?token=${token}`;
        console.log('[Auth] Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
    })(req, res, next);
});

router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User.findById(decoded.id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({ result: user });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

module.exports = router;
