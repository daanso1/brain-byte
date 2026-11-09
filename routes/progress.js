const express = require('express');
const router = express.Router();
const { completeLesson, getUserProgress } = require('../controllers/progressController');
const { requireAuth } = require('../middleware/auth');

router.post('/complete/:lessonId', requireAuth, completeLesson);
router.get('/me', requireAuth, getUserProgress);

module.exports = router;
