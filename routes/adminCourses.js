const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  listCourses, getCourse, createCourse, updateCourse,
  addLesson, updateLesson, addQuestion, deleteQuestion,
} = require('../controllers/adminCourseController');

// Every route in this file is admin-only: the server checks the role
// in the database on every request, not just in the browser.
router.use(requireAuth, requireAdmin);

router.get('/', listCourses);
router.post('/', createCourse);
router.put('/lessons/:lessonId', updateLesson);
router.delete('/questions/:questionId', deleteQuestion);
router.get('/:id', getCourse);
router.put('/:id', updateCourse);
router.post('/:id/lessons', addLesson);
router.post('/:id/questions', addQuestion);

module.exports = router;