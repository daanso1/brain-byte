// Promotes the user matching ADMIN_EMAIL (from .env) to admin role.
// Runs on every startup. If that user hasn't registered yet, does nothing
// (register first, then restart the server).
const db = require('../config/db');

const adminEmail = process.env.ADMIN_EMAIL;

if (adminEmail) {
  const user = db.prepare('SELECT id, role FROM users WHERE email = ?').get(adminEmail);
  if (user && user.role !== 'admin') {
    db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(user.id);
    console.log(`Promoted ${adminEmail} to admin.`);
  } else if (!user) {
    console.log(`ADMIN_EMAIL is set to ${adminEmail}, but no account with that email exists yet.`);
  }
}

module.exports = {};