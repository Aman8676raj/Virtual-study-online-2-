const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const jwt = require('jsonwebtoken');
require('dotenv').config();
require('./config/passport');
const passport = require('passport');

const Room = require('./models/Room');
const roomWhiteboards = new Map();
const whiteboardSaveTimers = new Map();
const roomHosts = new Map();
const roomWhiteboardVersions = new Map();
const roomLastDrawers = new Map();
const roomWhiteboardStatus = new Map();

function verifyHost(socket, roomId) {
    const hostId = roomHosts.get(roomId);
    if (socket.user?.id !== hostId) {
        socket.emit("host-error", { message: "Only host can perform this action" });
        return false;
    }
    return true;
}

function debounceMongoSave(roomId, stateJSON) {
    if (whiteboardSaveTimers.has(roomId)) {
        clearTimeout(whiteboardSaveTimers.get(roomId));
    }
    whiteboardSaveTimers.set(roomId, setTimeout(async () => {
        try {
            await Room.updateOne({ roomId }, { whiteboardState: JSON.stringify(stateJSON) });
        } catch (e) {
            console.error('Error saving whiteboard to Mongo', e);
        }
        whiteboardSaveTimers.delete(roomId);
    }, 10000)); // 10 seconds debounce
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: true, // Mirrors the incoming request Origin dynamically for LAN devices
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: true,
    credentials: true
}));
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

const PORT = process.env.PORT || 5001;

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

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        const guestName = socket.handshake.auth?.guestName || 'Guest';
        socket.user = { id: `guest_${socket.id}`, name: guestName };
        return next();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; 
        next();
    } catch (err) {
        // Fallback for expired token
        const guestName = socket.handshake.auth?.guestName || 'Guest';
        socket.user = { id: `guest_${socket.id}`, name: guestName };
        next();
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id, 'UserID:', socket.user?.id);

    socket.on('join-room', async (roomId) => {
        // Enforce max capacity of 6
        const room = io.sockets.adapter.rooms.get(roomId);
        if (room && room.size >= 6) {
            socket.emit('room-full');
            return; // Reject joining
        }

        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);

        // Fetch room data and whiteboard state
        let state = roomWhiteboards.get(roomId);
        let hostId = roomHosts.get(roomId);

        if (!state || !hostId) {
            try {
                const dbRoom = await Room.findOne({ roomId });
                if (dbRoom) {
                    if (!hostId) {
                        hostId = dbRoom.createdBy.toString();
                        roomHosts.set(roomId, hostId);
                    }
                    if (dbRoom.whiteboardState && !state) {
                        state = JSON.parse(dbRoom.whiteboardState);
                        roomWhiteboards.set(roomId, state);
                    }
                }
            } catch (err) {
                console.error("Error fetching room DB state", err);
            }
        }
        
        socket.emit('room-details', { hostId });
        
        const wbStatus = roomWhiteboardStatus.get(roomId);
        if (wbStatus) {
             socket.emit('whiteboard-status', wbStatus);
        }

        if (state) {
            const serverVer = roomWhiteboardVersions.get(roomId) || 0;
            socket.emit('sync-whiteboard-state', { state, version: serverVer });
        }
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
        roomLastDrawers.set(data.roomId, socket.id);
        socket.broadcast.to(data.roomId).emit('whiteboard-draw', data);
    });

    // Silent save behind the scenes (debounced from drawing strokes)
    socket.on('whiteboard-save-state', (data) => {
        const { roomId, state } = data;
        roomWhiteboards.set(roomId, state);
        
        const currentVer = roomWhiteboardVersions.get(roomId) || 0;
        const newVer = currentVer + 1;
        roomWhiteboardVersions.set(roomId, newVer);

        debounceMongoSave(roomId, state);
        socket.broadcast.to(roomId).emit('whiteboard-version', { version: newVer });
    });

    // Explicit full canvas replacement (undo/redo/clear)
    socket.on('whiteboard-full-sync', (data) => {
        const { roomId, state } = data;
        roomWhiteboards.set(roomId, state);
        
        const currentVer = roomWhiteboardVersions.get(roomId) || 0;
        const newVer = currentVer + 1;
        roomWhiteboardVersions.set(roomId, newVer);

        debounceMongoSave(roomId, state);
        socket.broadcast.to(roomId).emit('whiteboard-full-sync', { state, version: newVer });
    });

    // Full canvas replacement via Master Flatten Optimization
    socket.on('whiteboard-flatten-sync', (data) => {
        const { roomId, state } = data;
        roomWhiteboards.set(roomId, state);
        
        const currentVer = roomWhiteboardVersions.get(roomId) || 0;
        const newVer = currentVer + 1;
        roomWhiteboardVersions.set(roomId, newVer);

        debounceMongoSave(roomId, state);
        socket.broadcast.to(roomId).emit('whiteboard-full-sync', { state, version: newVer });
    });

    // Global presentation mode toggle
    socket.on('toggle-whiteboard-status', (data) => {
        roomWhiteboardStatus.set(data.roomId, data);
        socket.broadcast.to(data.roomId).emit('whiteboard-status', data);
    });
    
    // Integrity checking for stale clients
    socket.on('request-whiteboard-integrity', (data) => {
        const { roomId, clientVersion } = data;
        const serverVer = roomWhiteboardVersions.get(roomId) || 0;
        if (serverVer > clientVersion) {
            const state = roomWhiteboards.get(roomId);
            if (state) {
                socket.emit('sync-whiteboard-state', { state, version: serverVer });
            }
        }
    });

    socket.on('request-whiteboard-state', (roomId) => {
        const state = roomWhiteboards.get(roomId);
        const serverVer = roomWhiteboardVersions.get(roomId) || 0;
        if (state) {
            socket.emit('sync-whiteboard-state', { state, version: serverVer });
        }
    });

    socket.on('whiteboard-cursor', (data) => {
        // Volatile stops socket from buffering this on slow connections to prevent lag spikes
        socket.volatile.broadcast.to(data.roomId).emit('whiteboard-cursor', data);
    });

    socket.on('toggle-media', ({ roomId, peerID, type, status }) => {
        socket.broadcast.to(roomId).emit('media-toggled', { peerID, type, status });
    });

    socket.on('whiteboard-clear', (roomId) => {
        if (!verifyHost(socket, roomId)) return; // Only host can globally clear
        roomWhiteboards.set(roomId, null); // Clear cache
        debounceMongoSave(roomId, null);
        socket.broadcast.to(roomId).emit('whiteboard-clear');
    });

    // --- Host Controls ---
    socket.on('toggle-whiteboard-access', ({ roomId, isEnabled }) => {
        if (!verifyHost(socket, roomId)) return;
        io.to(roomId).emit('whiteboard-access-changed', isEnabled);
    });

    socket.on('remove-participant', ({ roomId, participantId }) => {
        if (!verifyHost(socket, roomId)) return;
        io.to(participantId).emit('kicked-from-room');
        const targetSocket = io.sockets.sockets.get(participantId);
        if (targetSocket) {
            targetSocket.leave(roomId);
            targetSocket.disconnect(true);
        }
    });

    socket.on('mute-participant', ({ roomId, participantId, type }) => {
        if (!verifyHost(socket, roomId)) return;
        io.to(participantId).emit('force-mute', type); // type: 'audio' or 'video'
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.to(roomId).emit('user-disconnected', socket.id);
            
            // Presenter Reassignment Hierarchy (Host -> Last Drawer -> Oldest Joiner)
            const status = roomWhiteboardStatus.get(roomId);
            if (status && status.isOpen && status.ownerId === socket.id) {
                const hostId = roomHosts.get(roomId);
                const lastDrawer = roomLastDrawers.get(roomId);
                
                const roomSet = io.sockets.adapter.rooms.get(roomId);
                if (roomSet) {
                    const remaining = Array.from(roomSet).filter(id => id !== socket.id);
                    if (remaining.length === 0) {
                        roomWhiteboardStatus.delete(roomId);
                    } else {
                        let newOwnerId = null;
                        if (remaining.includes(hostId)) newOwnerId = hostId;
                        else if (lastDrawer && remaining.includes(lastDrawer)) newOwnerId = lastDrawer;
                        else newOwnerId = remaining[0];
                        
                        let newOwnerName = "Participant";
                        const targetSocket = io.sockets.sockets.get(newOwnerId);
                        if (targetSocket) newOwnerName = targetSocket.user?.name || targetSocket.user?.username || "Participant";
                        
                        const newStatus = { roomId, isOpen: true, ownerId: newOwnerId, ownerName: newOwnerName };
                        roomWhiteboardStatus.set(roomId, newStatus);
                        io.to(roomId).emit('whiteboard-status', newStatus);
                    }
                }
            }
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        socket.broadcast.emit('call-ended');
    });
});

server.listen(PORT, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                localIp = alias.address;
                break;
            }
        }
    }
    console.log(`Server running on:`);
    console.log(`  - Local:   http://localhost:${PORT}`);
    console.log(`  - Network: http://${localIp}:${PORT}`);
    console.log('MongoDB connected');
});
