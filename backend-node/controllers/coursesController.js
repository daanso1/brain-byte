const db = require('../config/db');

function getAllCourses(req, res) {
  const courses = db.prepare('SELECT * FROM courses ORDER BY difficulty ASC, title ASC').all();
  res.json(courses);
}

function getCourseWithLessons(req, res) {
  const { id } = req.params;
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const lessons = db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC').all(id);

  // If authenticated, attach completion state per lesson
  let progressMap = {};
  if (req.user) {
    const rows = db
      .prepare(
        `SELECT lesson_id, completed, score FROM user_progress
         WHERE user_id = ? AND lesson_id IN (${lessons.map(() => '?').join(',') || 'NULL'})`
      )
      .all(req.user.id, ...lessons.map((l) => l.id));
    progressMap = Object.fromEntries(rows.map((r) => [r.lesson_id, r]));
  }

  const lessonsWithProgress = lessons.map((l) => ({
    ...l,
    completed: !!progressMap[l.id]?.completed,
    score: progressMap[l.id]?.score ?? null,
  }));

  res.json({ ...course, lessons: lessonsWithProgress });
}

function getLesson(req, res) {
  const { id } = req.params;
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
  res.json(lesson);
}

module.exports = { getAllCourses, getCourseWithLessons, getLesson };
