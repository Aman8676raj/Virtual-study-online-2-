import React, { useEffect, useRef, useState, memo } from 'react';
import { Canvas, PencilBrush, Path, classRegistry, Image as FabricImage } from 'fabric';
import toast from 'react-hot-toast';

// Register Path class for loadFromJSON deserialization in Fabric.js v6
classRegistry.setClass(Path);
import { useSocket } from '../context/SocketContext';

const colors = [
    '#e11d48', '#db2777', '#c026d3', '#9333ea', '#7c3aed',
    '#4f46e5', '#2563eb', '#0284c7', '#0891b2', '#0d9488',
    '#059669', '#16a34a', '#ea580c'
];

export const getStringColor = (str) => {
    if (!str) return colors[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

// Extracted to prevent rapid state changes from triggering canvas re-renders
const CursorsOverlay = memo(({ socket, roomId, presenterId }) => {
    const [cursors, setCursors] = useState({});

    useEffect(() => {
        if (!socket) return;
        const handleCursor = (data) => {
            setCursors(prev => ({
                ...prev,
                [data.peerId]: { ...data, lastActive: Date.now() }
            }));
        };
        const handleDisconnect = (peerId) => {
            setCursors(prev => {
                const next = { ...prev };
                delete next[peerId];
                return next;
            });
        };
        socket.on('whiteboard-cursor', handleCursor);
        socket.on('user-disconnected', handleDisconnect);
        return () => {
            socket.off('whiteboard-cursor', handleCursor);
            socket.off('user-disconnected', handleDisconnect);
        };
    }, [socket]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setCursors(prev => {
                let changed = false;
                const next = { ...prev };
                for (const pid in next) {
                    if (now - next[pid].lastActive > 3000) {
                        delete next[pid];
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {Object.values(cursors).map(c => {
                if (c.peerId === socket?.id) return null; // Hide own loopback cursor
                return (
                    <div 
                        key={c.peerId}
                        className={`absolute top-0 left-0 transition-all duration-75 ease-linear flex flex-col items-center pointer-events-none ${c.isDrawing ? 'scale-110 drop-shadow-xl' : ''}`}
                        style={{ transform: `translate(${c.x}px, ${c.y}px)` }}
                    >
                        {c.peerId === presenterId && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-400 drop-shadow-md text-sm z-50 animate-bounce">
                                👑
                            </div>
                        )}
                        <svg className={`w-5 h-5 drop-shadow-md transition-all ${c.isDrawing ? 'animate-pulse scale-110' : ''}`} style={{ color: c.color, fill: c.color, stroke: c.peerId === presenterId ? '#fbbf24' : 'white', strokeWidth: c.peerId === presenterId ? 2 : 1.5 }} viewBox="0 0 24 24">
                            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87a.5.5 0 00.35-.85L5.5 3.21z" />
                        </svg>
                        <div className={`px-1.5 py-0.5 mt-0.5 rounded text-white text-[10px] font-bold shadow-sm whitespace-nowrap opacity-90 transition-opacity pointer-events-none flex items-center gap-1 ${c.peerId === presenterId ? 'border border-amber-400 bg-slate-900' : ''}`} style={{ backgroundColor: c.peerId === presenterId ? '#1e293b' : c.color }}>
                            {c.name}
                            {c.isDrawing && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

// Canvas Container completely isolated from React DOM changes
const StaticCanvasWrapper = memo(({ setCanvasRef }) => {
    return (
        <div className="absolute inset-0 z-0 bg-white">
            <canvas ref={setCanvasRef} className="w-full h-full" />
        </div>
    );
});

const Whiteboard = ({ roomId, isPresenter, canDraw, presenterId }) => {
    const canvasRef = useRef(null);
    const [canvas, setCanvas] = useState(null);
    const socket = useSocket();
    const isDrawingRef = useRef(false);
    const updateTimeoutRef = useRef(null);
    const transmitTimerRef = useRef(null);
    const undoStack = useRef([]);
    const redoStack = useRef([]);
    const syncVersionRef = useRef(0);
    const isDrawingActualRef = useRef(false);
    const drawTimerRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user'));
    const currentUserName = user?.username || user?.name || localStorage.getItem('guestName') || 'Guest';

    // 1. Initial mounting configuration
    useEffect(() => {
        if (!canvasRef.current) return;

        const initCanvas = new Canvas(canvasRef.current, {
            isDrawingMode: canDraw,
            width: 800,
            height: 600,
            selection: false,
        });

        initCanvas.backgroundColor = '#ffffff';
        initCanvas.freeDrawingBrush = new PencilBrush(initCanvas);
        initCanvas.freeDrawingBrush.width = 4;
        initCanvas.freeDrawingBrush.color = getStringColor(socket?.id || currentUserName);
        initCanvas.renderAll();

        setCanvas(initCanvas);

        return () => {
            initCanvas.dispose();
        };
    }, []);

    // 2. React to permissions dynamically
    useEffect(() => {
        if (canvas) {
            canvas.isDrawingMode = canDraw;
        }
    }, [canvas, canDraw]);

    // 3. Socket event bindings
    useEffect(() => {
        if (!canvas || !socket) return;

        // Fetch strict state on load (for late joiners to sync perfectly)
        socket.emit('request-whiteboard-state', roomId);

        // --- Integrity sync checks ---
        const handleReconnect = () => {
             socket.emit('request-whiteboard-integrity', { roomId, clientVersion: syncVersionRef.current });
        };
        const handleVersionCheck = (data) => {
             if (data.version > syncVersionRef.current) {
                 socket.emit('request-whiteboard-integrity', { roomId, clientVersion: syncVersionRef.current });
             }
        };
        socket.io?.on('reconnect', handleReconnect);
        socket.on('whiteboard-version', handleVersionCheck);

        const saveHistoryAndEmit = () => {
            if (!canvas) return;
            const currentJSON = canvas.toJSON();
            undoStack.current.push(currentJSON);
            undoStack.current = undoStack.current.slice(-15); // Limit undo history to 15 chunks
            redoStack.current = [];

            // ONLY save to memory/db (No broadcasting loadFromJSON strokes)
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = setTimeout(() => {
                socket.emit('whiteboard-save-state', { roomId, state: currentJSON });
            }, 300);
        };

        // --- Active Drawing Transmission ---
        const emitCursor = (pointer, forceDrawState = null) => {
            if (forceDrawState !== null) isDrawingActualRef.current = forceDrawState;
            
            if (!transmitTimerRef.current) {
                transmitTimerRef.current = setTimeout(() => {
                    socket.emit('whiteboard-cursor', {
                        roomId,
                        peerId: socket.id,
                        name: currentUserName,
                        x: pointer.x,
                        y: pointer.y,
                        color: getStringColor(socket.id || currentUserName),
                        isDrawing: isDrawingActualRef.current
                    });
                    transmitTimerRef.current = null;
                }, 40);
            }
        };

        const handleCanvasMouseMove = (options) => {
            const pointer = options.scenePoint || (canvas.getScenePoint ? canvas.getScenePoint(options.e) : canvas.getPointer(options.e));
            emitCursor(pointer);
        };

        const handleMouseDown = (options) => {
            if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
            drawTimerRef.current = setTimeout(() => {
                const pointer = options.scenePoint || (canvas.getScenePoint ? canvas.getScenePoint(options.e) : canvas.getPointer(options.e));
                emitCursor(pointer, true);
            }, 150); // Require 150ms sustained click to trigger drawing halo
        };

        const handleMouseUp = (options) => {
            if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
            const pointer = options.scenePoint || (canvas.getScenePoint ? canvas.getScenePoint(options.e) : canvas.getPointer(options.e));
            emitCursor(pointer, false);
        };

        const handlePathCreated = (e) => {
            if (!isDrawingRef.current) {
                socket.emit('whiteboard-draw', {
                    roomId,
                    path: e.path.toObject(),
                });
                saveHistoryAndEmit();
            }
        };

        const handleObjectModified = () => {
            if (!isDrawingRef.current) saveHistoryAndEmit();
        };

        // --- Performance Flattening ---
        let lastRenderTime = performance.now();
        const handleBeforeRender = () => { lastRenderTime = performance.now(); };
        const handleAfterRender = () => {
            if (!isPresenter || isDrawingRef.current) return;
            const lag = performance.now() - lastRenderTime;
            const objCount = canvas.getObjects().length;
            
            // Flatten if rendering > 30ms (below 30fps drop) AND 100+ objects, OR hard cap 300
            if ((lag > 30 && objCount > 100) || objCount >= 300) {
                flattenCanvas(lag);
            }
        };

        const flattenCanvas = (currentLag) => {
             if (canvas.getObjects().length <= 1) return;
             isDrawingRef.current = true;
             
             if (currentLag > 80) { // Only show toast if flattening takes very noticeable time
                 toast('Optimizing board...', { id: 'optimize', duration: 1500, style: { fontSize: '13px' } });
             }

             const currentJSON = canvas.toJSON();
             const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
             
             FabricImage.fromURL(dataUrl).then((img) => {
                 undoStack.current.push(currentJSON); // Keep heavy history snapshot
                 undoStack.current = undoStack.current.slice(-10);
                 
                 canvas.clear();
                 canvas.backgroundImage = img;
                 canvas.renderAll();
                 
                 socket.emit('whiteboard-flatten-sync', { roomId, state: canvas.toJSON() });
                 isDrawingRef.current = false;
             }).catch(err => {
                 console.error("Optimization failed:", err);
                 isDrawingRef.current = false;
             });
        };

        canvas.on('mouse:move', handleCanvasMouseMove);
        canvas.on('mouse:down', handleMouseDown);
        canvas.on('mouse:up', handleMouseUp);
        canvas.on('path:created', handlePathCreated);
        canvas.on('object:modified', handleObjectModified);
        canvas.on('before:render', handleBeforeRender);
        canvas.on('after:render', handleAfterRender);

        // Event: Load an entire JSON canvas state (Joiners / Undo / Redo / Clear / Optimize / Reconnects)
        const applyFullSync = (data) => {
            if (!data || !data.state) return;
            if (data.version) syncVersionRef.current = data.version;
            
            isDrawingRef.current = true; // Prevent drawing loops
            canvas.loadFromJSON(data.state).then(() => {
                canvas.renderAll();
                if (undoStack.current.length === 0) {
                    undoStack.current.push(canvas.toJSON());
                }
                isDrawingRef.current = false;
            }).catch(err => {
                console.error("Error loading canvas state:", err);
                isDrawingRef.current = false;
            });
        };

        const handleSyncState = (data) => applyFullSync(data);
        const handleFullSync = (data) => applyFullSync(data);

        // Event: Receive incrementally drawn paths directly (No disappearing loads)
        const handleDraw = (data) => {
            isDrawingRef.current = true;
            try {
                const path = new Path(data.path.path, data.path);
                canvas.add(path);
                canvas.renderAll();
            } catch (err) {
                console.error("Fabric path error:", err);
            }
            isDrawingRef.current = false;
        };

        const handleClear = () => {
             canvas.clear();
             canvas.backgroundColor = '#ffffff';
             canvas.renderAll();
        };

        socket.on('sync-whiteboard-state', handleSyncState);
        socket.on('whiteboard-full-sync', handleFullSync);
        socket.on('whiteboard-draw', handleDraw);
        socket.on('whiteboard-clear', handleClear);

        return () => {
            socket.io?.off('reconnect', handleReconnect);
            socket.off('whiteboard-version', handleVersionCheck);
            canvas.off('mouse:move', handleCanvasMouseMove);
            canvas.off('mouse:down', handleMouseDown);
            canvas.off('mouse:up', handleMouseUp);
            canvas.off('path:created', handlePathCreated);
            canvas.off('object:modified', handleObjectModified);
            canvas.off('before:render', handleBeforeRender);
            canvas.off('after:render', handleAfterRender);
            socket.off('sync-whiteboard-state', handleSyncState);
            socket.off('whiteboard-full-sync', handleFullSync);
            socket.off('whiteboard-draw', handleDraw);
            socket.off('whiteboard-clear', handleClear);
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
            if (transmitTimerRef.current) clearTimeout(transmitTimerRef.current);
            if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
        };
    }, [canvas, socket, roomId]);

    const clearCanvas = () => {
        if (canvas) {
            const currentJSON = canvas.toJSON();
            undoStack.current.push(currentJSON);
            
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            socket.emit('whiteboard-clear', roomId);
            // Push full sync explicitly
            socket.emit('whiteboard-full-sync', { roomId, state: canvas.toJSON() });
        }
    };

    const undo = () => {
        if (!canvas || undoStack.current.length === 0) return;
        isDrawingRef.current = true;
        redoStack.current.push(canvas.toJSON());
        const prevState = undoStack.current.pop();
        canvas.loadFromJSON(prevState).then(() => {
            canvas.renderAll();
            socket.emit('whiteboard-full-sync', { roomId, state: prevState });
            isDrawingRef.current = false;
        }).catch(e => {
            console.error(e);
            isDrawingRef.current = false;
        });
    };

    const redo = () => {
        if (!canvas || redoStack.current.length === 0) return;
        isDrawingRef.current = true;
        undoStack.current.push(canvas.toJSON());
        const nextState = redoStack.current.pop();
        canvas.loadFromJSON(nextState).then(() => {
            canvas.renderAll();
            socket.emit('whiteboard-full-sync', { roomId, state: nextState });
            isDrawingRef.current = false;
        }).catch(e => {
            console.error(e);
            isDrawingRef.current = false;
        });
    };

    return (
        <div className="flex flex-col items-center gap-4 h-full bg-slate-50 dark:bg-transparent relative">
            {/* Locked presentation label */}
            {!canDraw && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[60] bg-slate-900/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Only presenter can draw
                </div>
            )}

            {/* Whiteboard Workspace */}
            <div className={`flex-1 w-full border rounded-xl shadow-sm overflow-hidden bg-white relative ${isPresenter ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-[#1c1c1e]' : 'border-slate-200 dark:border-white/10'}`}>
                {/* 1. Unmoving DOM boundary for Fabric */}
                <StaticCanvasWrapper setCanvasRef={canvasRef} />
                
                {/* 2. React UI Overlay for cursor movements */}
                <CursorsOverlay socket={socket} roomId={roomId} presenterId={presenterId} />
            </div>

            {/* Bottom Tools Menu (Only active if canDraw) */}
            <div className={`flex flex-wrap gap-2 md:gap-4 bg-white dark:bg-[#1c1c1e] p-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-opacity ${!canDraw ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center gap-2 px-2 border-r border-slate-200 dark:border-white/10">
                    <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Color</label>
                    <input
                        type="color"
                        defaultValue={getStringColor(socket?.id || currentUserName)}
                        onChange={(e) => {
                            if (canvas) canvas.freeDrawingBrush.color = e.target.value;
                        }}
                        className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                </div>
                <div className="flex items-center gap-2 px-2 border-r border-slate-200 dark:border-white/10">
                    <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Size</label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        defaultValue="5"
                        onChange={(e) => {
                            if (canvas) canvas.freeDrawingBrush.width = parseInt(e.target.value, 10);
                        }}
                        className="cursor-pointer accent-indigo-500"
                    />
                </div>
                <button onClick={undo} className="text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 px-3 py-1 rounded-lg font-medium transition text-sm">Undo</button>
                <button onClick={redo} className="text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 px-3 py-1 rounded-lg font-medium transition text-sm mr-2 border-r border-slate-200 dark:border-white/10">Redo</button>
                <button onClick={clearCanvas} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-1 rounded-lg font-medium transition text-sm">Clear Board</button>
            </div>
        </div>
    );
};

export default Whiteboard;
