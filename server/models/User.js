const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: false
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    avatar: {
        type: String,
        default: ''
    },
    studyStats: {
        totalHours: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        lastStudyDate: { type: Date, default: null }
    }
});

module.exports = mongoose.model('User', userSchema);
