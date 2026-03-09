import React, { useState } from 'react';
import { MessageCircle, Heart, Reply, MoreHorizontal } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const Comment = ({ comment, postId, refreshComments, depth = 0 }) => {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const user = JSON.parse(localStorage.getItem('user'));

    const handleReply = async () => {
        if (!replyContent.trim()) return;
        try {
            await axios.post(`${API_URL}/api/community/${postId}/comments`, {
                content: replyContent,
                userId: user._id,
                parentId: comment._id
            });
            setReplyContent('');
            setShowReplyInput(false);
            refreshComments();
        } catch (err) {
            console.error(err);
        }
    };

    // Limit nesting depth visual indentation to prevent squeezing
    const nestingLevel = Math.min(depth, 5);

    return (
        <div className={`mt-4 ${depth > 0 ? 'ml-4 md:ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author?.username}`} alt="avatar" />
                </div>
                <div className="flex-1 bg-gray-50 p-3 rounded-2xl rounded-tl-none">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-900 text-sm">{comment.author?.username}</span>
                        <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 mt-1 ml-12">
                <button
                    onClick={() => setShowReplyInput(!showReplyInput)}
                    className="text-xs font-semibold text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                >
                    <Reply size={14} /> Reply
                </button>
            </div>

            {showReplyInput && (
                <div className="ml-12 mt-2 flex gap-2">
                    <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                        autoFocus
                    />
                    <button onClick={handleReply} className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg">Reply</button>
                </div>
            )}

            {/* Recursively render child comments (replies) */}
            {comment.replies && comment.replies.map(reply => (
                <Comment
                    key={reply._id}
                    comment={reply}
                    postId={postId}
                    refreshComments={refreshComments}
                    depth={depth + 1}
                />
            ))}
        </div>
    );
};

const CommentSection = ({ postId, isOpen }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const user = JSON.parse(localStorage.getItem('user'));

    // Fetch comments only when expanded
    React.useEffect(() => {
        if (isOpen) {
            fetchComments();
        }
    }, [isOpen, postId]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/community/${postId}/comments`);
            const rawComments = res.data;

            // Organize flat comments into a tree structure
            const commentMap = {};
            const rootComments = [];

            rawComments.forEach(c => {
                c.replies = [];
                commentMap[c._id] = c;
            });

            rawComments.forEach(c => {
                if (c.parent) {
                    if (commentMap[c.parent]) {
                        commentMap[c.parent].replies.push(c);
                    }
                } else {
                    rootComments.push(c);
                }
            });

            setComments(rootComments);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        try {
            await axios.post(`${API_URL}/api/community/${postId}/comments`, {
                content: newComment,
                userId: user._id
            });
            setNewComment('');
            fetchComments();
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="mt-6 border-t border-gray-100 pt-6 animate-in slide-in-from-top-2 duration-200">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MessageCircle size={18} className="text-indigo-600" /> Discussion
            </h4>

            <div className="flex gap-4 mb-8">
                <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} alt="avatar" />
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="What are your thoughts?"
                        className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                    />
                    <div className="flex justify-end mt-2">
                        <button onClick={handlePostComment} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition">Comment</button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <p className="text-center text-gray-500 text-sm py-4">Loading comments...</p>
                ) : comments.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">No comments yet. Be the first to start the conversation!</p>
                ) : (
                    comments.map(comment => (
                        <Comment
                            key={comment._id}
                            comment={comment}
                            postId={postId}
                            refreshComments={fetchComments}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default CommentSection;
