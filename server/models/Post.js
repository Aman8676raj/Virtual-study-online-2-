const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    image: { type: String }, // URL to image
    tags: [{ type: String }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of user IDs
    comments: { type: Number, default: 0 }, // We'll keep this as a cached count for performance
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
