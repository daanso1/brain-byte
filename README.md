# Brain Byte 🧠

A digital skills training platform built for South African youth who want to learn
IT and programming skills but don't have access to a university or college.

Free, self-paced courses, an AI system that recommends what to learn next, a
progress-tracking dashboard, and gamification (points, levels, badges, streaks,
a leaderboard) to keep learners motivated.

---

## Architecture

Brain Byte is three small services that share one SQLite database:

```
┌─────────────────┐      ┌──────────────────────┐      ┌───────────────────────────┐
│  Frontend        │ ───▶ │  Node.js / Express     │ ───▶ │  Python / Flask            │
│  HTML/CSS/JS      │      │  Auth, courses,        │      │  AI recommendation engine  │
│  (served by Node) │ ◀─── │  progress, gamification │ ◀─── │  (scikit-learn model)      │
└─────────────────┘      └──────────┬───────────┘      └──────────┬────────────────┘
                                     │                              │
                                     └──────────────┬───────────────┘
                                                     ▼
                                          SQLite database (shared file)
```

- **Frontend** (`/frontend`) — plain HTML, CSS and JavaScript. No framework or build
  step, so it's easy to read, present, and modify. Node serves it as static files.
- **Backend** (`/backend-node`) — Express REST API. Handles registration/login (JWT
  auth, bcrypt password hashing), courses & lessons, progress tracking, and the
  gamification logic (points, levels, badge criteria, leaderboard). Talks to the
  AI service over HTTP for recommendations.
- **AI service** (`/ai-service-python`) — a Flask microservice with a trained
  `RandomForestClassifier` (scikit-learn) that scores how good a fit each course
  is for a given learner, based on their completed lessons, average difficulty
  mastered, quiz scores, streak, and interest category. See
  [`ai-service-python/train_model.py`](ai-service-python/train_model.py) for the
  full explanation of how the model is trained and why.

Why three services instead of one? It mirrors how this would realistically be
built in industry (a lightweight app backend + a separate ML service), and it's
a natural way to demonstrate polyglot backend skills (Node **and** Python) in one
project, as the brief called for.

---

## Features (mapped to the project brief)

| Requirement | Where it lives |
|---|---|
| Functional web application | Full registration → login → browse courses → complete lessons flow |
| AI-based learning recommendation system | `ai-service-python/` — trained scikit-learn model, see below |
| User progress tracking dashboard | `dashboard.html` — points, level, streak, per-course byte-meters |
| Gamified learning features | Points, levels, 7 badge types, day streaks, leaderboard |

---

## Setup

You'll need **Node.js 18+**, **Python 3.9+**, and **pip**.

### 1. Install backend dependencies and seed the database

```bash
cd backend-node
npm install
cp .env.example .env      # edit JWT_SECRET if you like
npm run seed               # creates database/brainbyte.db with courses, lessons, badges
```

### 2. Install and train the AI service

```bash
cd ../ai-service-python
pip install -r requirements.txt --break-system-packages   # omit the flag if not needed on your system
python3 train_model.py     # trains the model, saves it to model/recommender_model.joblib
```

### 3. Run both services (two terminals)

```bash
# Terminal 1
cd ai-service-python
python3 app.py              # runs on http://localhost:5001

# Terminal 2
cd backend-node
npm start                   # runs on http://localhost:3000
```

### 4. Open the app

Visit **http://localhost:3000** — that's it. The Node server serves the frontend
and the API from the same origin.

> The dashboard's recommendation panel calls the Node API, which calls the Python
> service. If the Python service isn't running, Node automatically falls back to
> showing beginner-friendly unstarted courses instead of erroring out — see
> `recommendationsController.js`.

---

## How the AI recommendation system works

There's no real interaction history for a brand-new platform, so `train_model.py`
generates a large synthetic training set using a heuristic that encodes a genuine
pedagogical idea: learners engage most with content that **matches their
demonstrated interest** and is **only slightly harder** than what they've already
mastered (their "zone of proximal development"), with streak and quiz performance
as secondary signals. A `RandomForestClassifier` is trained on this data
(~86% validation accuracy, ~0.94 ROC AUC in testing).

At request time, `app.py`:
1. Reads the requesting user's completed lessons, average difficulty mastered,
   average quiz score, and current streak straight from the shared SQLite database.
2. Builds a feature vector for every course they haven't finished yet.
3. Runs the trained model to score each one, and returns the top 5, each with a
   plain-language reason ("Matches your strongest interest area", etc).

As real usage data accumulates in `user_progress`, the same script can be pointed
at real logs instead of synthetic data to keep improving the model — worth
mentioning in a project writeup/demo as the natural next step.

---

## Project structure

```
brain-byte/
├── backend-node/
│   ├── config/db.js              SQLite connection
│   ├── controllers/              auth, courses, progress, gamification, recommendations
│   ├── middleware/auth.js        JWT verification
│   ├── routes/                   Express route definitions
│   ├── database/schema.sql       table definitions
│   ├── database/seed.js          course/lesson/badge seed data
│   └── server.js                 app entry point
├── ai-service-python/
│   ├── train_model.py            trains & saves the recommendation model
│   ├── app.py                    Flask API serving predictions
│   └── requirements.txt
└── frontend/
    ├── index.html, login.html, register.html
    ├── dashboard.html, courses.html, course.html, lesson.html
    ├── css/style.css             design system (byte-meter component, etc.)
    └── js/                       api.js (shared fetch/auth helper), dashboard.js
```

## Extending it further

Ideas if you want to push this further for a higher mark or a portfolio piece:
- Swap SQLite for MySQL (the schema is standard SQL — mainly `AUTOINCREMENT` → `AUTO_INCREMENT`
  and swapping `better-sqlite3`/`sqlite3` for `mysql2`/`PyMySQL`).
- Add a simple quiz UI per lesson feeding real `score` values into `user_progress`,
  which the recommender already uses.
- Retrain `train_model.py` periodically on real `user_progress` data instead of
  synthetic data once you have real users.
- Add an admin view for course authors to add lessons through the UI instead of `seed.js`.
