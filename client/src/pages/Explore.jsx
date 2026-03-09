import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Compass, Search, Code, Atom, BookOpen, Users } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_URL from '../config';

const Explore = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [trendingRooms, setTrendingRooms] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/explore`);
                setCategories(res.data.categories);
                setTrendingRooms(res.data.trendingRooms);
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
    }, []);

    // Helper to map icon string to Component
    const getIcon = (iconName) => {
        if (iconName === 'Code') return <Code size={20} />;
        if (iconName === 'Atom') return <Atom size={20} />;
        if (iconName === 'BookOpen') return <BookOpen size={20} />;
        return <Users size={20} />;
    };

    return (
        <div className="min-h-screen pt-24 px-6 md:px-12 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-10 text-center"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-full text-sm font-semibold mb-4">
                    <Compass size={16} />
                    <span>Discover</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 font-display">Explore Study Rooms</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Find the perfect environment to focus, collaborate, and learn with others.</p>
            </motion.div>

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-2xl mx-auto mb-16 relative"
            >
                <div className="glass rounded-2xl relative overflow-hidden flex items-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <Search className="text-gray-400" size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for topics, rooms, or tags..."
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-none outline-none focus:ring-0 transition-all text-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 relative z-10"
                    />
                </div>
            </motion.div>

            {/* Categories */}
            <div className="mb-16">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Browse by Category</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categories.map((cat, idx) => (
                        <motion.div
                            key={idx}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="glass p-6 rounded-2xl hover:shadow-lg transition-all text-center group cursor-pointer border border-gray-100 dark:border-white/5 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl -mr-8 -mt-8"></div>
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                {getIcon(cat.icon)}
                            </div>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">{cat.name}</span>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Trending */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Trending Now</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trendingRooms.map((room) => (
                        <motion.div
                            key={room._id}
                            whileHover={{ y: -5 }}
                            onClick={() => navigate(`/room/${room.roomId}`)}
                            className="glass p-6 rounded-2xl hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-1 rounded-md font-bold uppercase">General</span>
                                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                                    <Users size={14} />
                                    <span>{room.participants?.length || 0}</span>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{room.name}</h3>
                            <button className="w-full py-2 mt-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors">Join Room</button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Explore;
