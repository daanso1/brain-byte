const db = require('../config/db');
const { levelForPoints, checkAndAwardBadges } = require('./gamificationController');

function completeLesson(req, res) {
  const userId = req.user.id;
  const { lessonId } = req.params;
  const { answer_index } = req.body;

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

  // If this lesson has a quiz, the submitted answer must be correct.
  if (lesson.quiz_question) {
    if (answer_index === undefined || answer_index === null) {
      return res.status(400).json({ error: 'Please select an answer.' });
    }
    if (Number(answer_index) !== lesson.quiz_correct_index) {
      return res.status(200).json({ correct: false, message: 'Not quite — give it another try.' });
    }
  }

  const already = db
    .prepare('SELECT * FROM user_progress WHERE user_id = ? AND lesson_id = ?')
    .get(userId, lessonId);

  if (already && already.completed) {
    return res.status(200).json({ correct: true, message: 'Lesson already completed.', already_completed: true });
  }

  const now = new Date().toISOString();

  if (already) {
    db.prepare('UPDATE user_progress SET completed = 1, completed_at = ? WHERE id = ?').run(now, already.id);
  } else {
    db.prepare(
      'INSERT INTO user_progress (user_id, lesson_id, completed, completed_at) VALUES (?, ?, 1, ?)'
    ).run(userId, lessonId, now);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const newPoints = user.points + lesson.points_value;
  const newLevel = levelForPoints(newPoints);
  db.prepare('UPDATE users SET points = ?, level = ? WHERE id = ?').run(newPoints, newLevel, userId);

  const leveledUp = newLevel > user.level;
  const newBadges = checkAndAwardBadges(userId);

  res.json({
    correct: true,
    message: 'Lesson completed!',
    points_earned: lesson.points_value,
    total_points: newPoints,
    level: newLevel,
    leveled_up: leveledUp,
    new_badges: newBadges,
  });
}

function getUserProgress(req, res) {
  const userId = req.user.id;
  const rows = db
    .prepare(
      `SELECT up.lesson_id, up.completed, up.completed_at, l.title, l.course_id
       FROM user_progress up JOIN lessons l ON l.id = up.lesson_id
       WHERE up.user_id = ? ORDER BY up.completed_at DESC`
    )
    .all(userId);
  res.json(rows);
}

module.exports = { completeLesson, getUserProgress };