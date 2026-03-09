import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useSocket } from '../context/SocketContext';

const Whiteboard = ({ roomId }) => {
    const canvasRef = useRef(null);
    const [canvas, setCanvas] = useState(null);
    const socket = useSocket();
    const isDrawingRef = useRef(false);

    useEffect(() => {
        if (!canvasRef.current) return;

        const initCanvas = new fabric.Canvas(canvasRef.current, {
            isDrawingMode: true,
            width: 800,
            height: 600,
            backgroundColor: '#ffffff',
        });

        initCanvas.freeDrawingBrush = new fabric.PencilBrush(initCanvas);
        initCanvas.freeDrawingBrush.width = 5;
        initCanvas.freeDrawingBrush.color = '#000000';

        setCanvas(initCanvas);

        return () => {
            initCanvas.dispose();
        };
    }, []);

    useEffect(() => {
        if (!canvas || !socket) return;

        const handlePathCreated = (e) => {
            if (!isDrawingRef.current) {
                const path = e.path;
                socket.emit('whiteboard-draw', {
                    roomId,
                    path: path.toObject(),
                });
            }
        };

        canvas.on('path:created', (e) => {
            // Only emit if it's a user action (not programmatic)
            // Fabric doesn't easily distinguish, so we use a flag or just emit everything
            // Ideally, we check if the event originated from user interaction
            socket.emit('whiteboard-draw', {
                roomId,
                path: e.path.toObject(),
            });
        });

        socket.on('whiteboard-draw', (data) => {
            isDrawingRef.current = true;
            fabric.util.enlivenObjects([data.path], (objects) => {
                objects.forEach((obj) => {
                    canvas.add(obj);
                });
                canvas.renderAll();
                isDrawingRef.current = false;
            });
        });

        return () => {
            canvas.off('path:created');
            socket.off('whiteboard-draw');
        };
    }, [canvas, socket, roomId]);

    const clearCanvas = () => {
        if (canvas) {
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            socket.emit('whiteboard-clear', roomId);
        }
    };

    useEffect(() => {
        if (!socket || !canvas) return;

        socket.on('whiteboard-clear', () => {
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            canvas.renderAll();
        });

        return () => {
            socket.off('whiteboard-clear');
        }
    }, [socket, canvas]);

    return (
        <div className="flex flex-col items-center gap-4 h-full">
            <div className="flex-1 w-full border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white relative">
                <canvas ref={canvasRef} className="w-full h-full" />
            </div>
            <div className="flex gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 px-2 border-r border-gray-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Color</label>
                    <input
                        type="color"
                        onChange={(e) => {
                            if (canvas) canvas.freeDrawingBrush.color = e.target.value;
                        }}
                        className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                </div>
                <div className="flex items-center gap-2 px-2 border-r border-gray-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</label>
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
                <button
                    onClick={clearCanvas}
                    className="text-red-500 hover:bg-red-50 px-4 py-1 rounded-lg font-medium transition text-sm"
                >
                    Clear Board
                </button>
            </div>
        </div>
    );
};

export default Whiteboard;
