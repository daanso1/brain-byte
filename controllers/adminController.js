const db = require('../config/db');

function getAllUsers(req, res) {
  const users = db
    .prepare('SELECT id, name, email, role, points, level, streak_days, created_at FROM users ORDER BY created_at DESC')
    .all();
  res.json(users);
}

function getStats(req, res) {
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalCompletions = db.prepare('SELECT COUNT(*) as c FROM user_progress WHERE completed = 1').get().c;
  const totalCourses = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
  res.json({ totalUsers, totalCompletions, totalCourses });
}

function deleteUser(req, res) {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: "You can't delete your own admin account from this panel." });
  }
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found.' });
  res.json({ message: 'User deleted.' });
}

function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }

  const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found.' });

  res.json({ message: 'Role updated.' });
}

module.exports = { getAllUsers, getStats, deleteUser, updateUserRole };