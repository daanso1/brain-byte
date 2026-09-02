const db = require('../config/db');

// Level formula: every 100 points = 1 level, starting at level 1.
function levelForPoints(points) {
  return Math.floor(points / 100) + 1;
}

// Checks all badge criteria for a user and awards any newly-earned badges.
// Returns an array of newly earned badge objects (empty if none).
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
      // A course is "completed" if every lesson in some course is marked completed for this user.
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
      newlyEarned.push(badge);
    }
  }

  return newlyEarned;
}

function getDashboardSummary(req, res) {
  const userId = req.user.id;
  const user = db.prepare('SELECT id, name, email, points, level, streak_days FROM users WHERE id = ?').get(userId);

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

  res.json({
    user,
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    badges,
    course_progress: perCourseProgress,
    leaderboard,
  });
}

module.exports = { levelForPoints, checkAndAwardBadges, getDashboardSummary };
