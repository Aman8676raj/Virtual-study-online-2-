const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    durationMinutes: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudySession', studySessionSchema);
