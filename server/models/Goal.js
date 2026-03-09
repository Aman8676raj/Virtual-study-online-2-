const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    deadline: { type: Date },
    completed: { type: Boolean, default: false }
});

module.exports = mongoose.model('Goal', goalSchema);
