const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

// Create Room
router.post('/create', async (req, res) => {
    try {
        const { name, userId, password, settings } = req.body;
        const roomId = uuidv4();
        const newRoom = new Room({
            roomId,
            name,
            createdBy: userId,
            participants: [userId],
            password: password || undefined, // Store only if provided
            settings: settings || { timerDuration: 0 }
        });
        if (settings && settings.timerDuration > 0) {
            newRoom.settings.timerStartTime = new Date();
        }
        await newRoom.save();
        res.status(201).json(newRoom);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating room' });
    }
});

// Join Room
router.post('/join', async (req, res) => {
    try {
        const { roomId, userId, password } = req.body;
        const room = await Room.findOne({ roomId });
        if (!room) return res.status(404).json({ message: 'Room not found' });

        // Password Check
        if (room.password && room.password !== password) {
            return res.status(403).json({ message: 'Incorrect password', requiresPassword: true });
        }

        if (!room.participants.includes(userId)) {
            room.participants.push(userId);
            await room.save();
        }
        res.status(200).json(room);
    } catch (error) {
        res.status(500).json({ message: 'Error joining room' });
    }
});

// Get All Rooms
router.get('/', async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 }).limit(10).populate('participants', 'username');
        // Transform to hide password but show private status
        const safeRooms = rooms.map(room => {
            const r = room.toObject();
            return {
                ...r,
                hasPassword: !!r.password,
                password: undefined // Remove actual password
            };
        });
        res.status(200).json(safeRooms);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching rooms' });
    }
});

// Get Room
router.get('/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId }).populate('participants', 'username');
        if (!room) return res.status(404).json({ message: 'Room not found' });

        // For individual room fetch, we might need to know if it's protected if failing
        // But usually this call happens AFTER join validation or for room view
        // We'll mask password here too just in case
        const safeRoom = room.toObject();
        safeRoom.hasPassword = !!safeRoom.password;
        delete safeRoom.password;

        res.status(200).json(safeRoom);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching room' });
    }
});

module.exports = router;
