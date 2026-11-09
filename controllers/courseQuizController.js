const db = require('../config/db');
const { levelForPoints, checkAndAwardBadges } = require('./gamificationController');

const PASS_MARK = 60;   // percent needed to pass
const PASS_POINTS = 50; // bonus points, awarded once, the first time a learner passes

function parseOptions(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function findCourse(courseId) {
  return db.prepare('SELECT id, title FROM courses WHERE id = ?').get(courseId);
}

function resultFor(userId, courseId) {
  return (
    db
      .prepare('SELECT best_score, attempts, passed FROM course_quiz_results WHERE user_id = ? AND course_id = ?')
      .get(userId, courseId) || null
  );
}

// Light summary used on the course page. Works with or without a login.
function getQuizInfo(req, res) {
  const { courseId } = req.params;
  const course = findCourse(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const count = db.prepare('SELECT COUNT(*) AS c FROM course_questions WHERE course_id = ?').get(courseId).c;
  res.json({
    course_id: course.id,
    question_count: count,
    pass_mark: PASS_MARK,
    pass_points: PASS_POINTS,
    result: req.user ? resultFor(req.user.id, courseId) : null,
  });
}

// The questions themselves. The correct answers are NOT sent.
function getCourseQuiz(req, res) {
  const { courseId } = req.params;
  const course = findCourse(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const rows = db.prepare('SELECT id, question, options FROM course_questions WHERE course_id = ? ORDER BY id').all(courseId);
  if (rows.length === 0) return res.status(404).json({ error: 'This course does not have a quiz yet.' });

  res.json({
    course: { id: course.id, title: course.title },
    pass_mark: PASS_MARK,
    pass_points: PASS_POINTS,
    result: resultFor(req.user.id, courseId),
    questions: rows.map((r) => ({ id: r.id, question: r.question, options: parseOptions(r.options) })),
  });
}

function submitCourseQuiz(req, res) {
  const userId = req.user.id;
  const { courseId } = req.params;
  const { answers } = req.body || {};

  const course = findCourse(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'Please submit your answers.' });

  const questions = db.prepare('SELECT * FROM course_questions WHERE course_id = ? ORDER BY id').all(courseId);
  if (questions.length === 0) return res.status(404).json({ error: 'This course does not have a quiz yet.' });

  const chosenById = new Map();
  answers.forEach((a) => {
    if (a && Number.isInteger(Number(a.question_id)) && a.answer_index !== null && a.answer_index !== undefined) {
      chosenById.set(Number(a.question_id), Number(a.answer_index));
    }
  });
  if (questions.some((q) => !chosenById.has(q.id))) {
    return res.status(400).json({ error: 'Please answer every question before submitting.' });
  }

  let correctCount = 0;
  const review = questions.map((q) => {
    const chosen = chosenById.get(q.id);
    const isCorrect = chosen === q.correct_index;
    if (isCorrect) correctCount += 1;
    return {
      question_id: q.id,
      question: q.question,
      options: parseOptions(q.options),
      chosen_index: chosen,
      correct_index: q.correct_index,
      is_correct: isCorrect,
    };
  });

  const score = Math.round((correctCount / questions.length) * 100);
  const passedThisTime = score >= PASS_MARK;
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT * FROM course_quiz_results WHERE user_id = ? AND course_id = ?').get(userId, courseId);
  if (!existing) {
    db.prepare(
      `INSERT INTO course_quiz_results (user_id, course_id, best_score, attempts, passed, points_awarded, last_attempt_at)
       VALUES (?, ?, ?, 1, ?, 0, ?)`
    ).run(userId, courseId, score, passedThisTime ? 1 : 0, now);
  } else {
    db.prepare(
      `UPDATE course_quiz_results SET best_score = ?, attempts = attempts + 1, passed = ?, last_attempt_at = ? WHERE id = ?`
    ).run(Math.max(existing.best_score, score), existing.passed || passedThisTime ? 1 : 0, now, existing.id);
  }

  // Award the bonus points once, the first time the learner passes.
  let pointsAwarded = 0;
  let newBadges = [];
  let leveledUp = false;
  const row = db.prepare('SELECT * FROM course_quiz_results WHERE user_id = ? AND course_id = ?').get(userId, courseId);
  const before = db.prepare('SELECT points, level FROM users WHERE id = ?').get(userId);

  if (row.passed && row.points_awarded === 0) {
    const newPoints = before.points + PASS_POINTS;
    db.prepare('UPDATE users SET points = ?, level = ? WHERE id = ?').run(newPoints, levelForPoints(newPoints), userId);
    db.prepare('UPDATE course_quiz_results SET points_awarded = ? WHERE id = ?').run(PASS_POINTS, row.id);
    pointsAwarded = PASS_POINTS;
    newBadges = checkAndAwardBadges(userId);
  }

  const after = db.prepare('SELECT points, level FROM users WHERE id = ?').get(userId);
  leveledUp = after.level > before.level;

  res.json({
    score,
    correct: correctCount,
    total: questions.length,
    pass_mark: PASS_MARK,
    passed: passedThisTime,
    best_score: Math.max(existing ? existing.best_score : 0, score),
    points_awarded: pointsAwarded,
    total_points: after.points,
    level: after.level,
    leveled_up: leveledUp,
    new_badges: newBadges,
    review,
  });
}

module.exports = { getQuizInfo, getCourseQuiz, submitCourseQuiz, PASS_MARK, PASS_POINTS };