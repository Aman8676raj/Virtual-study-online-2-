import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Heart, Share2, MessageCircle, MoreHorizontal, Image as ImageIcon, X } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';
import CommentSection from '../components/CommentSection';

const Community = () => {
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [showImageInput, setShowImageInput] = useState(false);
    const [expandedPostId, setExpandedPostId] = useState(null);
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/community`);
            setPosts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        try {
            await axios.post(`${API_URL}/api/community`, {
                content: newPostContent,
                userId: user?._id, // Use real user ID
                tags: ["#general"], // Simplified for now
                image: imageUrl
            });
            setNewPostContent('');
            setImageUrl('');
            setShowImageInput(false);
            fetchPosts();
        } catch (err) {
            console.error(err);
        }
    };

    const handleLike = async (postId) => {
        try {
            // Optimistic update
            setPosts(posts.map(p => {
                if (p._id === postId) {
                    const isLiked = p.likes.includes(user._id);
                    return {
                        ...p,
                        likes: isLiked ? p.likes.filter(id => id !== user._id) : [...p.likes, user._id]
                    };
                }
                return p;
            }));

            await axios.put(`${API_URL}/api/community/${postId}/like`, { userId: user._id });
        } catch (err) {
            console.error(err);
            fetchPosts(); // Revert on error
        }
    };

    const toggleComments = (postId) => {
        setExpandedPostId(expandedPostId === postId ? null : postId);
    };

    return (
        <div className="min-h-screen pt-24 px-6 md:px-12 max-w-5xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 text-center"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-sm font-semibold mb-4">
                    <Heart size={16} />
                    <span>Community</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 font-display">Student Discussions</h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Connect, ask questions, and share your wins with students worldwide.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Feed */}
                <div className="md:col-span-2 space-y-6">
                    {/* Create Post Input */}
                    <div className="glass-card p-6 rounded-2xl flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'Guest'}`} alt="avatar" />
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Share something with the community..."
                                className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all mb-3"
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                            />

                            {showImageInput && (
                                <div className="flex gap-2 mb-3 animate-in slide-in-from-top-2">
                                    <input
                                        type="text"
                                        placeholder="Paste image URL here..."
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                    />
                                    <button onClick={() => setShowImageInput(false)} className="text-gray-400 hover:text-red-500"><X size={18} /></button>
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowImageInput(!showImageInput)}
                                        className={`p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors ${imageUrl ? 'text-indigo-600 bg-indigo-50' : ''}`}
                                        title="Add Image"
                                    >
                                        <ImageIcon size={20} />
                                    </button>
                                </div>
                                <button onClick={handleCreatePost} className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">Post</button>
                            </div>
                        </div>
                    </div>

                    {/* Posts */}
                    <AnimatePresence>
                        {posts.map((post) => (
                            <motion.div
                                key={post._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                layout
                                className="glass-card p-6 rounded-2xl hover:shadow-md transition-shadow duration-300"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 flex items-center justify-center text-indigo-700 font-bold text-sm overflow-hidden">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.username}`} alt="avatar" className="w-full h-full" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{post.author?.username}</h4>
                                            <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <button className="text-gray-300 hover:text-gray-500"><MoreHorizontal size={20} /></button>
                                </div>

                                <p className="text-gray-800 leading-relaxed mb-4 text-[15px]">{post.content}</p>

                                {post.image && (
                                    <div className="mb-4 rounded-xl overflow-hidden border border-gray-100">
                                        <img src={post.image} alt="Post attachment" className="w-full h-auto object-cover max-h-96" />
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {post.tags && post.tags.map((tag, i) => (
                                        <span key={i} className="text-xs font-medium text-blue-500 hover:underline cursor-pointer bg-blue-50 px-2 py-1 rounded-md">{tag}</span>
                                    ))}
                                </div>

                                <div className="flex items-center gap-6 border-t border-gray-50 pt-4">
                                    <button
                                        onClick={() => handleLike(post._id)}
                                        className={`flex items-center gap-2 text-sm font-bold transition-colors ${post.likes?.includes(user?._id) ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'}`}
                                    >
                                        <Heart size={20} fill={post.likes?.includes(user?._id) ? "currentColor" : "none"} />
                                        {post.likes?.length || 0}
                                    </button>
                                    <button
                                        onClick={() => toggleComments(post._id)}
                                        className={`flex items-center gap-2 text-sm font-bold transition-colors ${expandedPostId === post._id ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                    >
                                        <MessageCircle size={20} />
                                        {post.comments} Comments
                                    </button>
                                    <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors text-sm font-bold ml-auto">
                                        <Share2 size={20} />
                                    </button>
                                </div>

                                {/* Comment Section */}
                                <CommentSection postId={post._id} isOpen={expandedPostId === post._id} />

                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Sidebar */}
                <div className="space-y-6 hidden md:block">
                    <div className="glass p-6 rounded-2xl sticky top-28">
                        <h3 className="font-bold text-gray-900 mb-4">Popular Topics</h3>
                        <ul className="space-y-2">
                            {["#ExamPrep", "#LoFiBeats", "#ComputerScience", "#MentalHealth", "#Productivity"].map((topic, i) => (
                                <li key={i} className="flex justify-between items-center text-sm text-gray-600 hover:text-indigo-600 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                    <span className="font-medium">{topic}</span>
                                    <span className="text-gray-400 group-hover:text-indigo-500 text-xs bg-gray-100 group-hover:bg-indigo-50 px-2 py-1 rounded-full transition-colors">1.2k</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Community;
