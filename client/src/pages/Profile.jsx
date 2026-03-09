import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Camera, Save, RefreshCw, Link as LinkIcon } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const Profile = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});
    const [formData, setFormData] = useState({
        username: user.username || '',
        email: user.email || '', // Read-only usually
        password: '',
        confirmPassword: '',
        avatar: user.avatar || ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [customAvatarUrl, setCustomAvatarUrl] = useState('');

    // Preset avatars from DiceBear
    const presetAvatars = [
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka`,
        `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
        `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`
    ];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarSelect = (url) => {
        setFormData({ ...formData, avatar: url });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        if (formData.password && formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            setLoading(false);
            return;
        }

        try {
            const updatePayload = {
                username: formData.username,
                avatar: formData.avatar
            };
            if (formData.password) {
                updatePayload.password = formData.password;
            }

            const res = await axios.put(`${API_URL}/api/users/${user._id}`, updatePayload);

            // Update local storage and state
            const updatedUser = { ...user, ...res.data };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setMessage('Profile updated successfully!');
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (err) {
            console.error(err);
            setError('Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 px-4 pb-12 flex justify-center items-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl w-full glass-card rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 transition-colors"
            >
                {/* Left Panel: Preview */}
                <div className="md:w-1/3 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 p-8 md:p-12 text-white flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>

                    <div className="relative mb-6">
                        <div className="w-40 h-40 rounded-full bg-white/20 backdrop-blur-sm p-1 shadow-xl border-4 border-white/30 overflow-hidden">
                            {formData.avatar ? (
                                <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover bg-white dark:bg-gray-800" />
                            ) : (
                                <div className="w-full h-full bg-white dark:bg-gray-800 flex items-center justify-center text-4xl font-bold text-indigo-500">
                                    {formData.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <button className="absolute bottom-2 right-2 bg-white text-indigo-600 p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                            <Camera size={18} />
                        </button>
                    </div>

                    <h2 className="text-2xl font-bold font-display text-center mb-1">{formData.username || 'Your Name'}</h2>
                    <p className="text-indigo-100 text-sm mb-6">Student</p>

                    <div className="flex gap-2">
                        {presetAvatars.map((url, i) => (
                            <img
                                key={i}
                                src={url}
                                onClick={() => handleAvatarSelect(url)}
                                className={`w-10 h-10 rounded-full cursor-pointer border-2 transition-all hover:scale-110 bg-white ${formData.avatar === url ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                            />
                        ))}
                    </div>

                    <div className="mt-4 w-full">
                        <div className="relative">
                            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-200" />
                            <input
                                type="text"
                                placeholder="Paste image URL..."
                                value={customAvatarUrl}
                                onChange={(e) => {
                                    setCustomAvatarUrl(e.target.value);
                                    if (e.target.value) setFormData({ ...formData, avatar: e.target.value });
                                }}
                                className="w-full px-3 py-2 pl-9 bg-white/10 border border-indigo-400/30 rounded-lg text-xs text-white placeholder-indigo-300/50 focus:outline-none focus:ring-1 focus:ring-white/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Edit Form */}
                <div className="md:w-2/3 p-8 md:p-12 bg-white/50 dark:bg-indigo-950/20 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Profile Settings</h3>
                        <User className="text-gray-400" size={20} />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-700 dark:text-white"
                                        placeholder="johndoe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                                <div className="relative opacity-70">
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed font-medium"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1 ml-1">Email cannot be changed</p>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password <span className="text-gray-400 font-normal">(Optional)</span></label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm New Password"
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-4">
                            <button type="button" onClick={() => window.history.back()} className="px-6 py-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-medium">Cancel</button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary px-8 py-2.5 rounded-xl text-white font-medium shadow-lg shadow-indigo-500/30 disabled:opacity-70 flex items-center gap-2"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Profile;

