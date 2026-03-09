const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    password: {
        type: String, // Optional: if set, room is private
        select: true
    },
    settings: {
        timerDuration: { type: Number, default: 0 }, // in minutes
        timerStartTime: { type: Date }
    }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
