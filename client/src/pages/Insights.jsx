import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Clock, Zap, Target, TrendingUp, Calendar } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

// Placeholder/Simple Chart Component
const PlaceholderChart = ({ data = [], height = "h-32" }) => (
    <div className={`w - full ${height} flex items - end justify - between gap - 2`}>
        {data.map((h, i) => {
            // normalize height: max is ~100 or Find Max. Assuming max 120 mins for viz
            const pct = Math.min(100, (h / 120) * 100);
            return (
                <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}% ` }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="w-full bg-indigo-100 rounded-t-lg hover:bg-indigo-500 transition-colors relative group"
                >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {h} mins
                    </div>
                </motion.div>
            )
        })}
    </div>
);

const Insights = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const [data, setData] = useState({
        goals: [],
        activityGraph: [],
        stats: { totalHours: 0, streak: 0 }
    });

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/insights/${user._id}`);
            setData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen pt-24 px-6 md:px-12 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-sm font-semibold mb-4">
                    <BarChart2 size={16} />
                    <span>Analytics</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2 font-display">Your Insights</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">Track your progress and study habits over time.</p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                    { label: "Hours Studied", value: data.stats?.totalHours || 0, unit: "hrs", icon: <Clock size={20} />, color: "text-blue-600 bg-blue-50" },
                    { label: "Focus Score", value: "85", unit: "/ 100", icon: <Zap size={20} />, color: "text-amber-600 bg-amber-50" }, // Mocked still
                    { label: "Sessions", value: "12", unit: "total", icon: <Target size={20} />, color: "text-purple-600 bg-purple-50" }, // Mocked still
                    { label: "Streak", value: data.stats?.streak || 0, unit: "days", icon: <TrendingUp size={20} />, color: "text-green-600 bg-green-50" },
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass p-6 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl -mr-8 -mt-8"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p - 3 rounded - xl ${stat.color} `}>
                                {stat.icon}
                            </div>
                            {idx === 3 && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">ACTIVE</span>}
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-display">{stat.value} <span className="text-sm text-gray-400 font-normal">{stat.unit}</span></h3>
                        <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Graph */}
                <div className="lg:col-span-2 glass p-8 rounded-3xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Activity This Week</h3>
                        <select className="bg-gray-50 border-none rounded-lg text-sm text-gray-500 font-medium outline-none">
                            <option>Last 7 Days</option>
                            <option>Last Month</option>
                        </select>
                    </div>
                    <PlaceholderChart data={data.activityGraph} height="h-64" />
                    <div className="flex justify-between mt-4 text-xs text-gray-400 font-medium px-2">
                        <span>Day 1</span><span>Day 2</span><span>Day 3</span><span>Day 4</span><span>Day 5</span><span>Today</span>
                    </div>
                </div>

                {/* Side Panel */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-2xl shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Calendar size={18} className="text-indigo-500" /> Upcoming Goals</h3>
                        <ul className="space-y-4">
                            {data.goals.map((goal, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className={`mt - 1 w - 5 h - 5 rounded border flex items - center justify - center ${goal.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300'} `}>
                                        {goal.completed && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div>
                                        <p className={`text - sm font - medium ${goal.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-white'} `}>{goal.title}</p>
                                        <p className="text-xs text-gray-400">{new Date(goal.deadline).toLocaleDateString()}</p>
                                    </div>
                                </li>
                            ))}
                            {data.goals.length === 0 && <p className="text-sm text-gray-400">No goals set yet.</p>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Insights;
