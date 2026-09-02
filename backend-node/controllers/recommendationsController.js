const db = require('../config/db');

// Feature order used by the trained model
const FEATURE_COLUMNS = ['user_total_completed', 'user_avg_difficulty', 'user_avg_score', 'user_streak', 'course_difficulty', 'difficulty_gap', 'category_match'];

// Trained offline via scikit-learn LogisticRegression on engineered features.
const COEFFICIENTS = [-0.23181337030593113, -0.1507275501993226, 0.45650157280189485, 0.2195501531475769, 0.4779202403007271, 0.4804833631555931, 2.0214055377179263];
const INTERCEPT = -0.0018199040021051002;
const SCALER_MEAN = [14.354875, 1.9952269852881104, 70.20659353866603, 9.54675, 2.002375, 0.00714801471188948, 0.499375];
const SCALER_SCALE = [8.63986045803837, 0.57411060276861, 17.358054651200362, 5.768389241157362, 0.8157017588402026, 0.991448823886004, 0.49999960937484744];

function predictProba(featureDict) {
  let logit = INTERCEPT;
  FEATURE_COLUMNS.forEach((col, i) => {
    const z = (featureDict[col] - SCALER_MEAN[i]) / SCALER_SCALE[i];
    logit += COEFFICIENTS[i] * z;
  });
  return 1 / (1 + Math.exp(-logit));
}

function buildUserFeatures(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  const completedRows = db.prepare(`
    SELECT l.course_id, c.category, c.difficulty, up.score
    FROM user_progress up
    JOIN lessons l ON l.id = up.lesson_id
    JOIN courses c ON c.id = l.course_id
    WHERE up.user_id = ? AND up.completed = 1
  `).all(userId);

  const totalCompleted = completedRows.length;
  let avgDifficulty, avgScore, topCategory;

  if (totalCompleted > 0) {
    avgDifficulty = completedRows.reduce((s, r) => s + r.difficulty, 0) / totalCompleted;
    const scored = completedRows.filter(r => r.score != null).map(r => r.score);
    avgScore = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 75.0;
    const counts = {};
    completedRows.forEach(r => counts[r.category] = (counts[r.category] || 0) + 1);
    topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  } else {
    avgDifficulty = 1.0;
    avgScore = 75.0;
    topCategory = user.preferred_category;
  }

  return {
    features: { user_total_completed: totalCompleted, user_avg_difficulty: avgDifficulty, user_avg_score: avgScore, user_streak: user.streak_days },
    topCategory,
  };
}

function getRecommendations(req, res) {
  const userId = req.user.id;
  const result = buildUserFeatures(userId);
  if (!result) return res.status(404).json({ error: 'User not found.' });

  const { features, topCategory } = result;
  const courses = db.prepare('SELECT * FROM courses').all();

  const finishedCourseIds = new Set(
    db.prepare(`
      SELECT c.id as course_id FROM courses c
      WHERE NOT EXISTS (
        SELECT 1 FROM lessons l WHERE l.course_id = c.id
        AND NOT EXISTS (
          SELECT 1 FROM user_progress up
          WHERE up.lesson_id = l.id AND up.user_id = ? AND up.completed = 1
        )
      )
      AND EXISTS (SELECT 1 FROM lessons l2 WHERE l2.course_id = c.id)
    `).all(userId).map(r => r.course_id)
  );

  const candidates = courses.filter(c => !finishedCourseIds.has(c.id));
  if (candidates.length === 0) {
    return res.json({ recommendations: [], note: 'All courses completed. Nice work!' });
  }

  const results = candidates.map(course => {
    const categoryMatch = course.category === topCategory ? 1 : 0;
    const difficultyGap = course.difficulty - features.user_avg_difficulty;
    const fullFeatures = { ...features, course_difficulty: course.difficulty, difficulty_gap: difficultyGap, category_match: categoryMatch };
    const score = predictProba(fullFeatures);
    const reason = categoryMatch ? 'Matches your strongest interest area' : 'A good next step to broaden your skills';
    return { id: course.id, title: course.title, description: course.description, category: course.category, difficulty: course.difficulty, icon: course.icon, score: Math.round(score * 10000) / 10000, reason };
  });

  results.sort((a, b) => b.score - a.score);
  res.json({ recommendations: results.slice(0, 5), source: 'model', inferred_top_category: topCategory });
}

module.exports = { getRecommendations };