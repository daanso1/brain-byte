const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { sendPasswordResetEmail } = require('../services/emailService');

const CODE_EXPIRY_MINUTES = 15;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function requestReset(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Please enter your email address.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const genericResponse = { message: 'If an account with that email exists, a reset code has been sent.' };

  if (!user) {
    return res.json(genericResponse);
  }

  const code = generateCode();
  const expires = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE id = ?').run(code, expires, user.id);

  sendPasswordResetEmail(user, code).catch((err) =>
    console.error('Password reset email failed (non-fatal):', err.message)
  );

  res.json(genericResponse);
}

function confirmReset(req, res) {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code and new password are all required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !user.reset_code) {
    return res.status(400).json({ error: 'Invalid or expired code. Please request a new one.' });
  }

  if (new Date() > new Date(user.reset_code_expires)) {
    return res.status(400).json({ error: 'That code has expired. Please request a new one.' });
  }

  if (String(code).trim() !== user.reset_code) {
    return res.status(400).json({ error: 'Incorrect code. Please try again.' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, reset_code = NULL, reset_code_expires = NULL WHERE id = ?').run(
    hash, user.id
  );

  res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
}

module.exports = { requestReset, confirmReset };