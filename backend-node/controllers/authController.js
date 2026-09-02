const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailService');

function register(req, res) {
  const { name, email, password, preferred_category } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, preferred_category, last_active_date)
       VALUES (?, ?, ?, ?, date('now'))`
    )
    .run(name, email, passwordHash, preferred_category || null);

  const user = { id: info.lastInsertRowid, name, email };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

  sendWelcomeEmail(user).catch((err) => console.error('Welcome email failed (non-fatal):', err.message));

  res.status(201).json({ token, user });
}

function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const lastActive = row.last_active_date;
  let streak = row.streak_days;
  if (lastActive) {
    const diffDays = Math.round((new Date(today) - new Date(lastActive)) / 86400000);
    if (diffDays === 1) streak += 1;
    else if (diffDays > 1) streak = 1;
  } else {
    streak = 1;
  }

  db.prepare('UPDATE users SET streak_days = ?, last_active_date = ? WHERE id = ?').run(streak, today, row.id);

  const user = { id: row.id, name: row.name, email: row.email };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user, streak_days: streak });
}

function deleteAccount(req, res) {
  const userId = req.user.id;
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Account not found.' });
  }
  res.json({ message: 'Account deleted successfully.' });
}

module.exports = { register, login, deleteAccount };