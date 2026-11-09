const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { JWT_SECRET, requireAuth } = require('../middleware/auth');
const { getQuizInfo, getCourseQuiz, submitCourseQuiz } = require('../controllers/courseQuizController');

// Attaches req.user if a valid token is present, but does not require one.
function optionalAuth(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err) req.user = decoded;
    next();
  });
}

router.get('/:courseId/info', optionalAuth, getQuizInfo);
router.get('/:courseId', requireAuth, getCourseQuiz);
router.post('/:courseId/submit', requireAuth, submitCourseQuiz);

module.exports = router;