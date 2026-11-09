const db = require('../config/db');

function columnExists(table, column) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  return info.some((col) => col.name === column);
}

function addColumnIfMissing(table, column, definition) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Migration: added ${column} column to ${table} table.`);
  }
}

addColumnIfMissing('users', 'role', `TEXT NOT NULL DEFAULT 'user'`);
addColumnIfMissing('lessons', 'quiz_question', 'TEXT');
addColumnIfMissing('lessons', 'quiz_options', 'TEXT');
addColumnIfMissing('lessons', 'quiz_correct_index', 'INTEGER');
addColumnIfMissing('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('users', 'verification_code', 'TEXT');
addColumnIfMissing('users', 'verification_code_expires', 'TEXT');
addColumnIfMissing('users', 'reset_code', 'TEXT');
addColumnIfMissing('users', 'reset_code_expires', 'TEXT');

module.exports = {};