// Shared SQLite connection for the Node backend.
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'database', 'brainbyte.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

module.exports = db;
