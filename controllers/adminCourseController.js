const db = require('../config/db');

// ---------- helpers ----------
const clean = (value) => (typeof value === 'string' ? value.trim() : '');

function parseJsonArray(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// Validates and normalises the options + correct answer of a multiple-choice question.
function cleanChoice(body, questionKey = 'question') {
  const question = clean(body[questionKey]);
  const options = Array.isArray(body.options) ? body.options.map(clean) : [];
  const correct = Number(body.correct_index);

  if (!question) return { error: 'Please enter the question.' };
  if (question.length > 400) return { error: 'The question is too long (400 characters maximum).' };
  if (options.length !== 4 || options.some((o) => !o)) return { error: 'Please provide exactly 4 non-empty answer options.' };
  if (options.some((o) => o.length > 200)) return { error: 'Each answer option must be 200 characters or fewer.' };
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return { error: 'The 4 answer options must all be different.' };
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) return { error: 'Please choose which option is correct.' };
  return { value: { question, options, correct_index: correct } };
}

function cleanCourse(body) {
  const title = clean(body.title);
  const description = clean(body.description);
  const category = clean(body.category);
  const difficulty = Number(body.difficulty);
  const icon = clean(body.icon) || '📘';
  const tags = clean(body.tags);
  const overview = clean(body.overview);
  const prerequisites = clean(body.prerequisites);

  let outcomes = body.learning_outcomes;
  if (typeof outcomes === 'string') outcomes = outcomes.split('\n');
  outcomes = Array.isArray(outcomes) ? outcomes.map(clean).filter(Boolean) : [];

  let hours = body.estimated_hours;
  hours = hours === '' || hours === null || hours === undefined ? null : Number(hours);

  if (!title) return { error: 'Please enter a course title.' };
  if (title.length > 120) return { error: 'The title is too long (120 characters maximum).' };
  if (!description) return { error: 'Please enter a short description.' };
  if (description.length > 500) return { error: 'The short description is too long (500 characters maximum).' };
  if (!category) return { error: 'Please enter a category.' };
  if (category.length > 40) return { error: 'The category is too long (40 characters maximum).' };
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) return { error: 'Difficulty must be 1, 2 or 3.' };
  if (icon.length > 8) return { error: 'The icon should be a single emoji or short symbol.' };
  if (overview.length > 4000) return { error: 'The overview is too long (4000 characters maximum).' };
  if (prerequisites.length > 300) return { error: 'The prerequisites text is too long (300 characters maximum).' };
  if (outcomes.length > 12) return { error: 'Please list 12 learning outcomes or fewer.' };
  if (outcomes.some((o) => o.length > 200)) return { error: 'Each learning outcome must be 200 characters or fewer.' };
  if (hours !== null && (!Number.isInteger(hours) || hours < 1 || hours > 200)) {
    return { error: 'Estimated hours must be a whole number between 1 and 200.' };
  }

  return {
    value: {
      title, description, category, difficulty, icon,
      tags: tags || null,
      overview: overview || null,
      prerequisites: prerequisites || null,
      learning_outcomes: outcomes.length ? JSON.stringify(outcomes) : null,
      estimated_hours: hours,
    },
  };
}

function titleTaken(title, exceptId) {
  const row = db
    .prepare('SELECT id FROM courses WHERE lower(title) = lower(?) AND id != ?')
    .get(title, exceptId === undefined ? -1 : exceptId);
  return !!row;
}

function shapeLesson(l) {
  return {
    id: l.id,
    course_id: l.course_id,
    title: l.title,
    content: l.content,
    order_index: l.order_index,
    points_value: l.points_value,
    quiz_question: l.quiz_question || null,
    quiz_options: l.quiz_options ? parseJsonArray(l.quiz_options) : null,
    quiz_correct_index: l.quiz_correct_index === undefined ? null : l.quiz_correct_index,
  };
}

// ---------- courses ----------
function listCourses(req, res) {
  const courses = db
    .prepare(
      `SELECT c.id, c.title, c.category, c.difficulty, c.icon,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
              (SELECT COUNT(*) FROM course_questions q WHERE q.course_id = c.id) AS question_count
       FROM courses c ORDER BY c.id`
    )
    .all();
  res.json(courses);
}

function getCourse(req, res) {
  const { id } = req.params;
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const lessons = db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index, id').all(id).map(shapeLesson);
  const questions = db
    .prepare('SELECT id, question, options, correct_index FROM course_questions WHERE course_id = ? ORDER BY id')
    .all(id)
    .map((q) => ({ id: q.id, question: q.question, options: parseJsonArray(q.options), correct_index: q.correct_index }));

  res.json({
    ...course,
    learning_outcomes: course.learning_outcomes ? parseJsonArray(course.learning_outcomes) : [],
    lessons,
    questions,
  });
}

function createCourse(req, res) {
  const parsed = cleanCourse(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const c = parsed.value;
  if (titleTaken(c.title)) return res.status(409).json({ error: 'A course with that title already exists.' });

  const info = db
    .prepare(
      `INSERT INTO courses (title, description, category, difficulty, tags, icon, overview, learning_outcomes, prerequisites, estimated_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(c.title, c.description, c.category, c.difficulty, c.tags, c.icon, c.overview, c.learning_outcomes, c.prerequisites, c.estimated_hours);

  res.status(201).json({ id: Number(info.lastInsertRowid), message: 'Course created. Now add its lessons and quiz questions.' });
}

function updateCourse(req, res) {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM courses WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Course not found.' });

  const parsed = cleanCourse(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const c = parsed.value;
  if (titleTaken(c.title, Number(id))) return res.status(409).json({ error: 'Another course already uses that title.' });

  db.prepare(
    `UPDATE courses SET title = ?, description = ?, category = ?, difficulty = ?, tags = ?, icon = ?,
       overview = ?, learning_outcomes = ?, prerequisites = ?, estimated_hours = ? WHERE id = ?`
  ).run(c.title, c.description, c.category, c.difficulty, c.tags, c.icon, c.overview, c.learning_outcomes, c.prerequisites, c.estimated_hours, id);

  res.json({ message: 'Course updated.' });
}

// ---------- lessons ----------
function cleanLesson(body) {
  const title = clean(body.title);
  const content = clean(body.content);
  const points = body.points_value === undefined || body.points_value === '' ? 10 : Number(body.points_value);

  if (!title) return { error: 'Please enter a lesson title.' };
  if (title.length > 120) return { error: 'The lesson title is too long (120 characters maximum).' };
  if (!content) return { error: 'Please enter the lesson content.' };
  if (content.length > 8000) return { error: 'The lesson content is too long (8000 characters maximum).' };
  if (!Number.isInteger(points) || points < 1 || points > 100) return { error: 'Points must be a whole number between 1 and 100.' };

  // The lesson quiz is optional, but if a question is entered it must be complete.
  const wantsQuiz = clean(body.quiz_question) !== '' || (Array.isArray(body.quiz_options) && body.quiz_options.some((o) => clean(o)));
  let quiz = { quiz_question: null, quiz_options: null, quiz_correct_index: null };
  if (wantsQuiz) {
    const choice = cleanChoice({ question: body.quiz_question, options: body.quiz_options, correct_index: body.quiz_correct_index });
    if (choice.error) return { error: `Lesson quiz: ${choice.error}` };
    quiz = {
      quiz_question: choice.value.question,
      quiz_options: JSON.stringify(choice.value.options),
      quiz_correct_index: choice.value.correct_index,
    };
  }
  return { value: { title, content, points_value: points, ...quiz } };
}

function addLesson(req, res) {
  const { id } = req.params;
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const parsed = cleanLesson(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const l = parsed.value;

  const next = db.prepare('SELECT COALESCE(MAX(order_index), 0) + 1 AS n FROM lessons WHERE course_id = ?').get(id).n;
  const info = db
    .prepare(
      `INSERT INTO lessons (course_id, title, content, order_index, points_value, quiz_question, quiz_options, quiz_correct_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, l.title, l.content, next, l.points_value, l.quiz_question, l.quiz_options, l.quiz_correct_index);

  res.status(201).json({ id: Number(info.lastInsertRowid), message: 'Lesson added.' });
}

function updateLesson(req, res) {
  const { lessonId } = req.params;
  const existing = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
  if (!existing) return res.status(404).json({ error: 'Lesson not found.' });

  const parsed = cleanLesson(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const l = parsed.value;

  db.prepare(
    `UPDATE lessons SET title = ?, content = ?, points_value = ?, quiz_question = ?, quiz_options = ?, quiz_correct_index = ? WHERE id = ?`
  ).run(l.title, l.content, l.points_value, l.quiz_question, l.quiz_options, l.quiz_correct_index, lessonId);

  res.json({ message: 'Lesson updated.' });
}

// ---------- course quiz questions ----------
function addQuestion(req, res) {
  const { id } = req.params;
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const choice = cleanChoice(req.body || {});
  if (choice.error) return res.status(400).json({ error: choice.error });

  const info = db
    .prepare('INSERT INTO course_questions (course_id, question, options, correct_index) VALUES (?, ?, ?, ?)')
    .run(id, choice.value.question, JSON.stringify(choice.value.options), choice.value.correct_index);

  res.status(201).json({ id: Number(info.lastInsertRowid), message: 'Question added.' });
}

function deleteQuestion(req, res) {
  const { questionId } = req.params;
  const result = db.prepare('DELETE FROM course_questions WHERE id = ?').run(questionId);
  if (result.changes === 0) return res.status(404).json({ error: 'Question not found.' });
  res.json({ message: 'Question deleted.' });
}

module.exports = {
  listCourses, getCourse, createCourse, updateCourse,
  addLesson, updateLesson, addQuestion, deleteQuestion,
};