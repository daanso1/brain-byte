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

  let progressMap = {};
  if (req.user) {
    const rows = db
      .prepare(
        `SELECT lesson_id, completed FROM user_progress
         WHERE user_id = ? AND lesson_id IN (${lessons.map(() => '?').join(',') || 'NULL'})`
      )
      .all(req.user.id, ...lessons.map((l) => l.id));
    progressMap = Object.fromEntries(rows.map((r) => [r.lesson_id, r]));
  }

  const lessonsWithProgress = lessons.map((l) => ({
    id: l.id,
    course_id: l.course_id,
    title: l.title,
    order_index: l.order_index,
    points_value: l.points_value,
    completed: !!progressMap[l.id]?.completed,
  }));

  res.json({ ...course, lessons: lessonsWithProgress });
}

function getLesson(req, res) {
  const { id } = req.params;
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

  const result = { ...lesson };
  if (lesson.quiz_options) {
    try {
      result.quiz_options = JSON.parse(lesson.quiz_options);
    } catch (e) {
      result.quiz_options = null;
    }
  }

  res.json(result);
}

module.exports = { getAllCourses, getCourseWithLessons, getLesson };