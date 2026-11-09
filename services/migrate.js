// Safely adds new columns to an existing database without data loss.
// Runs automatically on every server startup — safe to run repeatedly.
const db = require('../config/db');

function columnExists(table, column) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  return info.some((col) => col.name === column);
}

if (!columnExists('users', 'role')) {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
  console.log('Migration: added role column to users table.');
}

module.exports = {};