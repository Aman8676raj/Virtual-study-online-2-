const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    icon: { type: String, required: true }, // Store icon name or SVG string? For now simpler to store generic type or name
    color: { type: String, required: true }  // Tailwind classes
});

module.exports = mongoose.model('Category', categorySchema);
