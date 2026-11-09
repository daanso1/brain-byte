const db = require('../config/db');

const BONUS_POINTS_PER_BADGE = 25;

const LEVEL_TITLES = [
  { min: 1, max: 2, title: 'Byte Beginner' },
  { min: 3, max: 4, title: 'Code Explorer' },
  { min: 5, max: 6, title: 'Logic Builder' },
  { min: 7, max: 9, title: 'Skill Stacker' },
  { min: 10, max: 14, title: 'Digital Craftsman' },
  { min: 15, max: 999, title: 'Byte Master' },
];

function levelForPoints(points) {
  return Math.floor(points / 100) + 1;
}

function levelTitleFor(level) {
  const match = LEVEL_TITLES.find((t) => level >= t.min && level <= t.max);
  return match ? match.title : 'Byte Beginner';
}

// Checks every badge's criteria for a user and awards any newly earned ones,
// plus bonus points for each. Returns the newly earned badges.
function checkAndAwardBadges(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return [];

  const lessonsCompleted = db
    .prepare('SELECT COUNT(*) as c FROM user_progress WHERE user_id = ? AND completed = 1')
    .get(userId).c;

  const allBadges = db.prepare('SELECT * FROM badges').all();
  const earnedIds = new Set(
    db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(userId).map((r) => r.badge_id)
  );

  const newlyEarned = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;

    let qualifies = false;
    if (badge.criteria_type === 'lessons_completed') {
      qualifies = lessonsCompleted >= badge.criteria_value;
    } else if (badge.criteria_type === 'streak') {
      qualifies = user.streak_days >= badge.criteria_value;
    } else if (badge.criteria_type === 'points') {
      qualifies = user.points >= badge.criteria_value;
    } else if (badge.criteria_type === 'course_completed') {
      const finishedCourses = db
        .prepare(
          `SELECT c.id FROM courses c
           WHERE NOT EXISTS (
             SELECT 1 FROM lessons l
             WHERE l.course_id = c.id
             AND NOT EXISTS (
               SELECT 1 FROM user_progress up
               WHERE up.lesson_id = l.id AND up.user_id = ? AND up.completed = 1
             )
           )
           AND EXISTS (SELECT 1 FROM lessons l2 WHERE l2.course_id = c.id)`
        )
        .all(userId);
      qualifies = finishedCourses.length >= badge.criteria_value;
    }

    if (qualifies) {
      db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badge.id);
      db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(BONUS_POINTS_PER_BADGE, userId);
      newlyEarned.push({ ...badge, bonus_points: BONUS_POINTS_PER_BADGE });
    }
  }

  if (newlyEarned.length > 0) {
    const updatedUser = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
    db.prepare('UPDATE users SET level = ? WHERE id = ?').run(levelForPoints(updatedUser.points), userId);
  }

  return newlyEarned;
}

// The next unfinished lesson in the course the learner worked on most recently.
// Returns null for a brand-new learner or when that course is fully completed.
function getContinueLearning(userId) {
  const lastProgress = db
    .prepare(
      `SELECT l.course_id FROM user_progress up
       JOIN lessons l ON l.id = up.lesson_id
       WHERE up.user_id = ? AND up.completed = 1
       ORDER BY up.completed_at DESC LIMIT 1`
    )
    .get(userId);

  if (!lastProgress) return null;

  const nextLesson = db
    .prepare(
      `SELECT l.id, l.title, l.course_id, c.title as course_title, c.icon as course_icon
       FROM lessons l JOIN courses c ON c.id = l.course_id
       WHERE l.course_id = ? AND l.id NOT IN (
         SELECT lesson_id FROM user_progress WHERE user_id = ? AND completed = 1
       )
       ORDER BY l.order_index ASC LIMIT 1`
    )
    .get(lastProgress.course_id, userId);

  return nextLesson || null;
}

function getDashboardSummary(req, res) {
  const userId = req.user.id;
  const user = db.prepare('SELECT id, name, email, points, level, streak_days FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const totalLessons = db.prepare('SELECT COUNT(*) as c FROM lessons').get().c;
  const completedLessons = db
    .prepare('SELECT COUNT(*) as c FROM user_progress WHERE user_id = ? AND completed = 1')
    .get(userId).c;

  const badges = db
    .prepare(
      `SELECT b.id, b.name, b.description, b.icon, ub.earned_at
       FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = ? ORDER BY ub.earned_at DESC`
    )
    .all(userId);

  const totalBadges = db.prepare('SELECT COUNT(*) as c FROM badges').get().c;

  const perCourseProgress = db
    .prepare(
      `SELECT c.id as course_id, c.title, c.icon, COUNT(l.id) as total_lessons,
              SUM(CASE WHEN up.completed = 1 THEN 1 ELSE 0 END) as completed_lessons
       FROM courses c
       JOIN lessons l ON l.course_id = c.id
       LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = ?
       GROUP BY c.id`
    )
    .all(userId);

  const leaderboard = db
    .prepare('SELECT name, points, level FROM users ORDER BY points DESC LIMIT 5')
    .all();

  const pointsIntoLevel = user.points % 100;

  res.json({
    user: { ...user, level_title: levelTitleFor(user.level) },
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    badges,
    total_badges: totalBadges,
    course_progress: perCourseProgress,
    leaderboard,
    points_into_level: pointsIntoLevel,
    points_to_next_level: 100 - pointsIntoLevel,
    continue_learning: getContinueLearning(userId),
  });
}

// Public: no login required.
function getPublicLeaderboard(req, res) {
  const leaderboard = db
    .prepare('SELECT name, points, level FROM users ORDER BY points DESC LIMIT 20')
    .all();
  res.json(leaderboard);
}

module.exports = {
  levelForPoints,
  levelTitleFor,
  checkAndAwardBadges,
  getDashboardSummary,
  getPublicLeaderboard,
};