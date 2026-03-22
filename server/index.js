const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();
require('./config/passport');
const passport = require('passport');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5000",
    process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// API routes (MUST come before static files and SPA catch-all)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/users', require('./routes/users'));
app.use('/api/explore', require('./routes/explore'));
app.use('/api/community', require('./routes/community'));
app.use('/api/insights', require('./routes/insights'));

// Serve React static files only if client build exists (for full-stack deployment)
const clientPath = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));
    // SPA catch-all fallback (MUST be LAST)
    app.use((req, res) => {
        res.sendFile(path.join(clientPath, 'index.html'));
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studyroom', {
    family: 4
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        if (err.name === 'MongoServerSelectionError' && !process.env.MONGO_URI) {
            console.log('Retrying with localhost...');
            mongoose.connect('mongodb://localhost:27017/studyroom', { family: 4 })
                .then(() => console.log('MongoDB connected (fallback)'))
                .catch(e => console.error('Fallback failed:', e));
        }
    });

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);
    });

    socket.on('send-message', (data) => {
        io.to(data.roomId).emit('receive-message', data);
    });

    socket.on('call-user', (data) => {
        io.to(data.userToCall).emit('call-user', { signal: data.signalData, from: data.from, name: data.name });
    });

    socket.on('answer-call', (data) => {
        io.to(data.to).emit('call-accepted', { signal: data.signal, from: socket.id, name: data.name });
    });

    socket.on('send-changes', (delta) => {
        socket.broadcast.to(delta.roomId).emit('receive-changes', delta);
    });

    socket.on('whiteboard-draw', (data) => {
        socket.broadcast.to(data.roomId).emit('whiteboard-draw', data);
    });

    socket.on('toggle-media', ({ roomId, peerID, type, status }) => {
        socket.broadcast.to(roomId).emit('media-toggled', { peerID, type, status });
    });

    socket.on('whiteboard-clear', (roomId) => {
        socket.broadcast.to(roomId).emit('whiteboard-clear');
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.to(roomId).emit('user-disconnected', socket.id);
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        socket.broadcast.emit('call-ended');
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
