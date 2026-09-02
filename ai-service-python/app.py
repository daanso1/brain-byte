"""
Brain Byte AI Recommendation Service

A dependency-free Flask microservice: it reads the shared SQLite database,
builds a feature profile for a learner, and scores each course using a
logistic regression model that was trained offline with scikit-learn.
The trained weights are baked in directly below, so this file needs
nothing but Flask at runtime — no scikit-learn/numpy/pandas installation
required, and no native compilation.
"""
import os
import sqlite3
import math
from collections import Counter

from flask import Flask, jsonify
from flask_cors import CORS


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "backend-node", "database", "brainbyte.db")

app = Flask(__name__)
CORS(app)

# Feature order matters — must match the order used during training.
FEATURE_COLUMNS = [
    "user_total_completed", "user_avg_difficulty", "user_avg_score",
    "user_streak", "course_difficulty", "difficulty_gap", "category_match",
]

# Trained offline via scikit-learn LogisticRegression on engineered
# features (see train_model.py for the training script). Validation
# performance: 83.6% accuracy, 0.91 ROC AUC.
COEFFICIENTS = [-0.23181337030593113, -0.1507275501993226, 0.45650157280189485,
                0.2195501531475769, 0.4779202403007271, 0.4804833631555931,
                2.0214055377179263]
INTERCEPT = -0.0018199040021051002

# StandardScaler parameters from training, needed to normalise features
# the same way before scoring.
SCALER_MEAN = [14.354875, 1.9952269852881104, 70.20659353866603,
               9.54675, 2.002375, 0.00714801471188948, 0.499375]
SCALER_SCALE = [8.63986045803837, 0.57411060276861, 17.358054651200362,
                5.768389241157362, 0.8157017588402026, 0.991448823886004,
                0.49999960937484744]


def predict_proba(feature_dict):
    """Pure-Python logistic regression scoring — no external ML library needed."""
    logit = INTERCEPT
    for i, col in enumerate(FEATURE_COLUMNS):
        z = (feature_dict[col] - SCALER_MEAN[i]) / SCALER_SCALE[i]
        logit += COEFFICIENTS[i] * z
    return 1 / (1 + math.exp(-logit))


def get_db():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(
            f"Database not found at {DB_PATH}. Run `node database/seed.js` in backend-node first."
        )
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def build_user_features(conn, user_id):
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None:
        return None, None

    completed_rows = conn.execute(
        """
        SELECT l.course_id, c.category, c.difficulty, up.score
        FROM user_progress up
        JOIN lessons l ON l.id = up.lesson_id
        JOIN courses c ON c.id = l.course_id
        WHERE up.user_id = ? AND up.completed = 1
        """,
        (user_id,),
    ).fetchall()

    user_total_completed = len(completed_rows)

    if user_total_completed > 0:
        user_avg_difficulty = sum(r["difficulty"] for r in completed_rows) / user_total_completed
        scored = [r["score"] for r in completed_rows if r["score"] is not None]
        user_avg_score = sum(scored) / len(scored) if scored else 75.0
        category_counts = Counter(r["category"] for r in completed_rows)
        top_category = category_counts.most_common(1)[0][0]
    else:
        user_avg_difficulty = 1.0
        user_avg_score = 75.0
        top_category = user["preferred_category"]

    features = {
        "user_total_completed": user_total_completed,
        "user_avg_difficulty": user_avg_difficulty,
        "user_avg_score": user_avg_score,
        "user_streak": user["streak_days"],
    }
    return features, top_category


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "brain-byte-ai-recommender"})


@app.route("/recommend/<int:user_id>")
def recommend(user_id):
    conn = get_db()
    try:
        user_features, top_category = build_user_features(conn, user_id)
        if user_features is None:
            return jsonify({"error": "User not found."}), 404

        courses = conn.execute("SELECT * FROM courses").fetchall()

        finished_course_ids = {
            row["course_id"]
            for row in conn.execute(
                """
                SELECT c.id as course_id FROM courses c
                WHERE NOT EXISTS (
                    SELECT 1 FROM lessons l WHERE l.course_id = c.id
                    AND NOT EXISTS (
                        SELECT 1 FROM user_progress up
                        WHERE up.lesson_id = l.id AND up.user_id = ? AND up.completed = 1
                    )
                )
                AND EXISTS (SELECT 1 FROM lessons l2 WHERE l2.course_id = c.id)
                """,
                (user_id,),
            ).fetchall()
        }

        candidates = [c for c in courses if c["id"] not in finished_course_ids]
        if not candidates:
            return jsonify({"recommendations": [], "note": "All courses completed. Nice work!"})

        results = []
        for course in candidates:
            category_match = 1 if course["category"] == top_category else 0
            difficulty_gap = course["difficulty"] - user_features["user_avg_difficulty"]
            full_features = {
                **user_features,
                "course_difficulty": course["difficulty"],
                "difficulty_gap": difficulty_gap,
                "category_match": category_match,
            }
            score = predict_proba(full_features)
            reason = "Matches your strongest interest area" if category_match else \
                     "A good next step to broaden your skills"
            results.append({
                "id": course["id"], "title": course["title"], "description": course["description"],
                "category": course["category"], "difficulty": course["difficulty"], "icon": course["icon"],
                "score": round(score, 4), "reason": reason,
            })

        results.sort(key=lambda r: r["score"], reverse=True)
        return jsonify({"recommendations": results[:5], "source": "model", "inferred_top_category": top_category})
    finally:
        conn.close()


if __name__ == "__main__":
    port = int(os.environ.get("AI_SERVICE_PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)