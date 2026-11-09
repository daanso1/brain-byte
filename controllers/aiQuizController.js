const db = require('../config/db');

async function generateQuiz(req, res) {
  const { text, numQuestions } = req.body;

  if (!text || text.trim().length < 50) {
    return res.status(400).json({ error: 'Please provide at least a few sentences of text to generate questions from.' });
  }

  const n = Math.min(Math.max(parseInt(numQuestions) || 5, 1), 10);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI quiz generation is not configured on this server. Add ANTHROPIC_API_KEY to your .env file.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Generate ${n} multiple-choice quiz questions based on the text below. Respond with ONLY valid JSON — an array of objects, each with "question" (string), "options" (array of exactly 4 strings), and "correct_index" (integer 0-3, the index of the correct option). No markdown formatting, no code fences, no explanation — just the raw JSON array.\n\nText:\n${text}`,
        }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return res.status(502).json({ error: 'The AI service returned an error. Check that your API key is valid and has available credits.' });
    }

    const data = await response.json();
    const rawText = (data.content || []).map((b) => b.text || '').join('');
    const cleaned = rawText.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '');

    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', rawText);
      return res.status(502).json({ error: 'The AI returned a response that could not be understood. Please try again.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(502).json({ error: 'The AI did not return any questions. Please try again with more text.' });
    }

    const valid = questions.filter(
      (q) => q.question && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correct_index)
    );

    res.json({ questions: valid });
  } catch (err) {
    console.error('Quiz generation failed:', err.message);
    res.status(500).json({ error: 'Quiz generation failed: ' + err.message });
  }
}

function saveQuizToLesson(req, res) {
  const { lessonId } = req.params;
  const { question, options, correct_index } = req.body;

  if (!question || !Array.isArray(options) || options.length !== 4 || correct_index === undefined || correct_index === null) {
    return res.status(400).json({ error: 'Invalid quiz data.' });
  }

  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

  db.prepare('UPDATE lessons SET quiz_question = ?, quiz_options = ?, quiz_correct_index = ? WHERE id = ?').run(
    question, JSON.stringify(options), correct_index, lessonId
  );

  res.json({ message: 'Quiz saved to lesson.' });
}

function listLessonsForPicker(req, res) {
  const lessons = db.prepare(
    `SELECT l.id, l.title, c.title as course_title FROM lessons l
     JOIN courses c ON c.id = l.course_id ORDER BY c.title, l.order_index`
  ).all();
  res.json(lessons);
}

module.exports = { generateQuiz, saveQuizToLesson, listLessonsForPicker };