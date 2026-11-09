const db = require('../config/db');

const CODE_EXPIRY_MINUTES = 15;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

function issueNewCode(userId) {
  const code = generateCode();
  const expires = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET verification_code = ?, verification_code_expires = ? WHERE id = ?').run(
    code, expires, userId
  );
  return code;
}

function verifyCode(req, res) {
  const userId = req.user.id;
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: 'Please enter the verification code.' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.email_verified) {
    return res.json({ message: 'Email already verified.', email_verified: 1 });
  }

  if (!user.verification_code) {
    return res.status(400).json({ error: 'No pending verification. Please request a new code.' });
  }

  if (new Date() > new Date(user.verification_code_expires)) {
    return res.status(400).json({ error: 'That code has expired. Please request a new one.' });
  }

  if (String(code).trim() !== user.verification_code) {
    return res.status(400).json({ error: 'Incorrect code. Please try again.' });
  }

  db.prepare(
    'UPDATE users SET email_verified = 1, verification_code = NULL, verification_code_expires = NULL WHERE id = ?'
  ).run(userId);

  res.json({ message: 'Email verified successfully!', email_verified: 1 });
}

function resendCode(req, res) {
  const userId = req.user.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.email_verified) {
    return res.json({ message: 'Email already verified.', email_verified: 1 });
  }

  const code = issueNewCode(userId);
  const { sendVerificationEmail } = require('../services/emailService');
  sendVerificationEmail(user, code).catch((err) => console.error('Resend verification email failed:', err.message));

  res.json({ message: 'A new code has been sent.' });
}

module.exports = { verifyCode, resendCode, issueNewCode, generateCode };