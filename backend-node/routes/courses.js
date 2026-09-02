const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { getAllCourses, getCourseWithLessons, getLesson } = require('../controllers/coursesController');
const { JWT_SECRET } = require('../middleware/auth');

// Optional auth: attaches req.user if a valid token is present, but doesn't require one.
function optionalAuth(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err) req.user = decoded;
    next();
  });
}

router.get('/', getAllCourses);
router.get('/:id', optionalAuth, getCourseWithLessons);
router.get('/lesson/:id', getLesson);

module.exports = router;
