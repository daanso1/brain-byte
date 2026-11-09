-- Brain Byte database schema
-- Shared by the Node.js API and the Python recommendation service

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    points          INTEGER NOT NULL DEFAULT 0,
    level           INTEGER NOT NULL DEFAULT 1,
    streak_days     INTEGER NOT NULL DEFAULT 0,
    last_active_date TEXT,
    preferred_category TEXT,           -- optional self-selected interest at signup
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL,     -- e.g. 'Web Development', 'Programming Basics', 'Data', 'Cybersecurity'
    difficulty      INTEGER NOT NULL,  -- 1 = beginner, 2 = intermediate, 3 = advanced
    tags            TEXT,              -- comma separated keywords, used as ML features
    icon            TEXT,              -- short emoji/label used in UI
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lessons (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,     -- markdown-ish plain text lesson body
    order_index     INTEGER NOT NULL,
    points_value    INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS user_progress (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id       INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed       INTEGER NOT NULL DEFAULT 0,
    score           INTEGER,           -- quiz score 0-100 if applicable
    completed_at    TEXT,
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS badges (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    icon            TEXT NOT NULL,
    criteria_type   TEXT NOT NULL,     -- 'lessons_completed', 'streak', 'points', 'course_completed'
    criteria_value  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id        INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at       TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS recommendation_cache (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    score           REAL NOT NULL,
    generated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
