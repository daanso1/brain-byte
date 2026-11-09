const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getAllUsers, getStats, deleteUser, updateUserRole } = require('../controllers/adminController');
const { generateQuiz, saveQuizToLesson, listLessonsForPicker } = require('../controllers/aiQuizController');

router.use(requireAuth, requireAdmin);
router.get('/users', getAllUsers);
router.get('/stats', getStats);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', updateUserRole);
router.post('/generate-quiz', generateQuiz);
router.post('/save-quiz/:lessonId', saveQuizToLesson);
router.get('/lessons-list', listLessonsForPicker);

module.exports = router;