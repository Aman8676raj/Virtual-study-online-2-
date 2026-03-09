const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const StudySession = require('../models/StudySession');
const User = require('../models/User');

router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const goals = await Goal.find({ user: userId });
        const sessions = await StudySession.find({ user: userId }).sort({ date: 1 });
        const user = await User.findById(userId);

        // Calculate "Activity This Week" for graph
        // Simplified: just return raw sessions, frontend can process or we process here
        // Let's process here: last 7 days aggregation
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = d.toISOString().split('T')[0];

            // Sum duration for this day
            const daySessions = sessions.filter(s => s.date.toISOString().startsWith(dayStr));
            const totalMinutes = daySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);

            last7Days.push(totalMinutes);
        }

        res.json({
            goals,
            activityGraph: last7Days,
            stats: user.studyStats
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
