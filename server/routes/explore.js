const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Room = require('../models/Room');

router.get('/', async (req, res) => {
    try {
        const categories = await Category.find();

        // Mock "Trending" logic: just take first 4 rooms for now
        // In real app, sort by participants count
        const trendingRooms = await Room.find().limit(4).populate('createdBy', 'username');

        res.json({ categories, trendingRooms });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
