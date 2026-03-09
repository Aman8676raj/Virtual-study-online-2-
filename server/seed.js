const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const Category = require('./models/Category');
const Post = require('./models/Post');
const Goal = require('./models/Goal');
const StudySession = require('./models/StudySession');
const User = require('./models/User');
const Room = require('./models/Room');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studyroom');
        console.log('MongoDB connected for seeding');

        // 1. Categories
        await Category.deleteMany({});
        await Category.insertMany([
            { name: "Computer Science", icon: "Code", color: "bg-blue-100 text-blue-600" },
            { name: "Mathematics", icon: "Atom", color: "bg-purple-100 text-purple-600" },
            { name: "Literature", icon: "BookOpen", color: "bg-amber-100 text-amber-600" },
            { name: "General Study", icon: "Users", color: "bg-green-100 text-green-600" }
        ]);
        console.log('Categories seeded');

        // 2. Dummy User for Posts (if not exists)
        let demoUser = await User.findOne({ email: 'demo@example.com' });
        if (!demoUser) {
            const hashedPassword = await bcrypt.hash('password123', 12);
            demoUser = await User.create({
                username: 'DemoUser',
                email: 'demo@example.com',
                password: hashedPassword,
                studyStats: { totalHours: 24.5, streak: 5 }
            });
        }

        // 3. Posts
        await Post.deleteMany({});
        await Post.insertMany([
            {
                author: demoUser._id,
                content: "Just finished a 4-hour deep work session! Using the Pomodoro technique really helped me stay focused. Anyone else use specific timers?",
                tags: ["#productivity", "#studyhacks"],
                likes: [],
                comments: 5,
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2h ago
            },
            {
                author: demoUser._id,
                content: "Looking for a study buddy for Advanced Physics. Ideally someone in timezone EST. We can quiz each other before finals!",
                tags: ["#physics", "#studybuddy"],
                likes: [],
                comments: 8,
                createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5h ago
            }
        ]);
        console.log('Posts seeded');

        // 4. Goals (for demo user)
        await Goal.deleteMany({ user: demoUser._id });
        await Goal.insertMany([
            { user: demoUser._id, title: "Complete Calculus Ch. 4", deadline: new Date(), completed: false },
            { user: demoUser._id, title: "Review React Hooks", deadline: new Date(Date.now() + 86400000), completed: false },
            { user: demoUser._id, title: "Submit Application", deadline: new Date(Date.now() - 86400000), completed: true }
        ]);
        console.log('Goals seeded');

        // 5. Study Sessions (Last 7 days mock data)
        await StudySession.deleteMany({ user: demoUser._id });
        const sessions = [40, 70, 30, 85, 50, 65, 90];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i)); // 6 days ago to today
            await StudySession.create({
                user: demoUser._id,
                durationMinutes: sessions[i],
                date: d
            });
        }
        console.log('Study Sessions seeded');

        // 6. Ensure some Rooms exist
        const roomCount = await Room.countDocuments();
        if (roomCount === 0) {
            await Room.create({ roomId: 'demo-room-1', name: 'Late Night Coding 🌙', createdBy: demoUser._id });
            await Room.create({ roomId: 'demo-room-2', name: 'Calculus Cram Session', createdBy: demoUser._id });
            await Room.create({ roomId: 'demo-room-3', name: 'Chill Lofi Study', createdBy: demoUser._id });
        }

        console.log('Seeding complete');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();
