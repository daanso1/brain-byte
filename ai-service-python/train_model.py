"""
Trains the Brain Byte course recommendation model.

The recommender predicts a "fit score" for a (learner, course) pair: how likely
this learner is to engage with and complete this course next, given:
  - how many lessons they've completed so far
  - the average difficulty of content they've already mastered
  - whether the course category matches their demonstrated interest
  - the size of the "difficulty gap" between the course and their current level
  - their average quiz score so far (a proxy for how challenged/confident they are)
  - their current learning streak (engagement momentum)

Real user interaction logs don't exist yet for a brand-new platform, so this
script generates a large synthetic dataset using a heuristic labelling
function that encodes sound pedagogical assumptions (e.g. learners engage
most with content that matches their interest and is only slightly harder
than what they've already mastered — the "zone of proximal development").
A RandomForestClassifier is then trained on this data. As real usage data
accumulates in `user_progress`, this same script can be re-run against
actual logs instead of synthetic ones to continuously improve the model.

Run with: python3 train_model.py
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score
import joblib
import json
import os

RNG = np.random.default_rng(42)
N_SAMPLES = 8000

FEATURE_COLUMNS = [
    "user_total_completed",
    "user_avg_difficulty",
    "user_avg_score",
    "user_streak",
    "course_difficulty",
    "difficulty_gap",
    "category_match",
]


def generate_synthetic_data(n=N_SAMPLES):
    user_total_completed = RNG.integers(0, 30, n)
    user_avg_difficulty = RNG.uniform(1.0, 3.0, n)
    user_avg_score = RNG.uniform(40, 100, n)
    user_streak = RNG.integers(0, 20, n)
    course_difficulty = RNG.integers(1, 4, n)
    category_match = RNG.integers(0, 2, n)

    difficulty_gap = course_difficulty - user_avg_difficulty

    df = pd.DataFrame({
        "user_total_completed": user_total_completed,
        "user_avg_difficulty": user_avg_difficulty,
        "user_avg_score": user_avg_score,
        "user_streak": user_streak,
        "course_difficulty": course_difficulty,
        "difficulty_gap": difficulty_gap,
        "category_match": category_match,
    })

    # Heuristic "ground truth" affinity score, then binarize with noise to
    # create a realistic, not-perfectly-separable classification problem.
    score = (
        1.6 * category_match
        - 0.9 * np.abs(difficulty_gap - 0.5)       # sweet spot: course ~0.5 harder than current level
        + 0.015 * user_streak                       # momentum makes people more receptive
        + 0.01 * (user_avg_score - 70)               # confident learners tolerate harder content
        - 0.05 * np.clip(user_total_completed - 20, 0, None)  # avoid over-recommending to power users
    )
    score += RNG.normal(0, 0.5, n)  # noise
    label = (score > np.median(score)).astype(int)

    df["label"] = label
    return df


def main():
    df = generate_synthetic_data()
    X = df[FEATURE_COLUMNS]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=5,
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, preds)
    auc = roc_auc_score(y_test, probs)

    print(f"Validation accuracy: {acc:.3f}")
    print(f"Validation ROC AUC:  {auc:.3f}")
    print("Feature importances:")
    for name, importance in sorted(zip(FEATURE_COLUMNS, model.feature_importances_), key=lambda x: -x[1]):
        print(f"  {name}: {importance:.3f}")

    os.makedirs("model", exist_ok=True)
    joblib.dump(model, "model/recommender_model.joblib")
    with open("model/feature_columns.json", "w") as f:
        json.dump(FEATURE_COLUMNS, f)

    print("\nSaved model to model/recommender_model.joblib")


if __name__ == "__main__":
    main()
