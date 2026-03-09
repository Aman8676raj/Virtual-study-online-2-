const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

const Comment = require('../models/Comment');

router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }).populate('author', 'username');
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.post('/', async (req, res) => {
    try {
        const { content, userId, tags, image } = req.body;
        const newPost = new Post({
            content,
            author: userId,
            tags,
            image
        });
        await newPost.save();
        res.json(newPost);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Toggle Like
router.put('/:id/like', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const { userId } = req.body;

        if (post.likes.includes(userId)) {
            post.likes = post.likes.filter(id => id.toString() !== userId);
        } else {
            post.likes.push(userId);
        }

        await post.save();
        res.json(post.likes);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Add Comment
router.post('/:id/comments', async (req, res) => {
    try {
        const { content, userId, parentId } = req.body;
        const post = await Post.findById(req.params.id);

        const newComment = new Comment({
            content,
            author: userId,
            post: req.params.id,
            parent: parentId || null
        });

        await newComment.save();

        // Update post comment count
        post.comments = await Comment.countDocuments({ post: req.params.id });
        await post.save();

        const populatedComment = await Comment.findById(newComment._id).populate('author', 'username');
        res.json(populatedComment);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get Comments for a Post
router.get('/:id/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ post: req.params.id })
            .populate('author', 'username')
            .sort({ createdAt: 1 });
        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
