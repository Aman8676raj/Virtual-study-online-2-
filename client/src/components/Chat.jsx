import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const Chat = ({ roomId, theme = 'light' }) => {
    const socket = useSocket();
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!socket) return;
        socket.on('receive-message', (data) => {
            setMessages((prev) => [...prev, data]);
        });
        return () => {
            socket.off('receive-message');
        };
    }, [socket, roomId]);

    const sendMessage = (e) => {
        // Handle both button click (event object) and direct call
        if (e && e.preventDefault) e.preventDefault();

        if (message.trim() && socket) {
            const msgData = { roomId, message, sender: user?.username || 'Guest' };
            socket.emit('send-message', msgData);
            setMessages((prev) => [...prev, msgData]);
            setMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-transparent transition-colors duration-300">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center mt-10 opacity-50 text-slate-500 dark:text-gray-400">
                        <div className="text-4xl mb-2">💬</div>
                        <p className="text-sm">No messages yet.<br />Start the conversation!</p>
                    </div>
                )}
                {messages.map((msg, index) => {
                    const isMe = msg.sender === user?.username;
                    return (
                        <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm break-words ${isMe
                                ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-500/20'
                                : 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-gray-100 rounded-bl-none border border-transparent dark:border-white/5'
                                }`}>
                                <p>{msg.message}</p>
                            </div>
                            <span className="text-[10px] mt-1 px-1 text-slate-400 dark:text-gray-500">
                                {isMe ? 'You' : msg.sender} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-transparent">
                <div className="flex gap-2 relative">
                    <input
                        type="text"
                        className="flex-1 rounded-full px-4 py-3 text-sm focus:outline-none transition-all bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500 dark:focus:bg-white/10 dark:focus:border-indigo-500/50"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!message.trim()}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0 ${message.trim()
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-gray-600'
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
