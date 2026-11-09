// Seeds the Brain Byte database with starter courses, lessons and badges.
// Run with: node database/seed.js
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'brainbyte.db');
const db = new DatabaseSync(DB_PATH);

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

const courses = [
  {
    title: 'Digital Literacy Foundations',
    description: 'Get comfortable with computers, the internet, email and online safety.',
    category: 'Foundations', difficulty: 1, tags: 'computers,internet,email,files,safety', icon: '💻',
    lessons: [
      ['What is a computer?', 'A computer is a device that takes input, processes it following instructions (a program), and produces output.', 10],
      ['Files, folders and storage', 'Files hold data. Folders organise files. Storage can be local or in the cloud.', 10],
      ['Staying safe online', 'Use strong, unique passwords and enable two-factor authentication where possible.', 15],
    ],
  },
  {
    title: 'HTML & CSS Fundamentals',
    description: 'Build your first web pages: structure content with HTML and style it with CSS.',
    category: 'Web Development', difficulty: 1, tags: 'html,css,web,frontend', icon: '🌐',
    lessons: [
      ['Structuring a page with HTML', 'HTML uses tags like <h1>, <p> and <div> to describe page structure.', 10],
      ['Styling with CSS', 'CSS controls colour, spacing, fonts and layout.', 10],
      ['Building a simple layout', 'Flexbox and Grid let you arrange elements responsively.', 15],
    ],
  },
  {
    title: 'JavaScript Basics',
    description: 'Learn the language that makes web pages interactive.',
    category: 'Programming', difficulty: 2, tags: 'javascript,programming,logic', icon: '⚡',
    lessons: [
      ['Variables and data types', 'Variables store data using let or const.', 10],
      ['Functions and logic', 'Functions are reusable blocks of code.', 15],
      ['Responding to user actions', 'Event listeners let JavaScript react to clicks.', 15],
    ],
  },
  {
    title: 'Python Programming Basics',
    description: 'A beginner-friendly introduction to Python.',
    category: 'Programming', difficulty: 1, tags: 'python,programming,logic', icon: '🐍',
    lessons: [
      ['Why Python?', 'Python reads almost like plain English.', 10],
      ['Variables, loops and conditionals', 'Python uses indentation to define code blocks.', 15],
      ['Writing your first functions', 'A function is defined with def and can return a result.', 15],
    ],
  },
  {
    title: 'Version Control with Git',
    description: 'Track changes to your code and collaborate with others.',
    category: 'Tools', difficulty: 2, tags: 'git,github,collaboration', icon: '🔧',
    lessons: [
      ['Why version control matters', 'Git records a history of every change to your code.', 10],
      ['Core Git commands', 'git add, git commit, and git push.', 15],
      ['Branches and collaboration', 'Branches let you work on features safely.', 15],
    ],
  },
  {
    title: 'Cybersecurity Essentials',
    description: 'Understand common digital threats and how to defend against them.',
    category: 'Cybersecurity', difficulty: 2, tags: 'security,privacy,networks', icon: '🔒',
    lessons: [
      ['Common attack types', 'Phishing, malware, and social engineering.', 15],
      ['Passwords and authentication', 'Password managers and 2FA reduce risk.', 10],
      ['Thinking like a defender', 'Give people only the access they need.', 15],
    ],
  },
  {
    title: 'Data & Spreadsheets for Everyone',
    description: 'Use spreadsheets to organise, analyse and present data.',
    category: 'Data', difficulty: 1, tags: 'data,spreadsheets,excel', icon: '📊',
    lessons: [
      ['Organising data in rows and columns', 'Keep one type of information per column.', 10],
      ['Formulas and functions', 'SUM, AVERAGE and IF calculate automatically.', 15],
      ['Telling a story with charts', 'Choose the right chart type for your data.', 10],
    ],
  },
];

const insertCourse = db.prepare(
  `INSERT INTO courses (title, description, category, difficulty, tags, icon) VALUES (?, ?, ?, ?, ?, ?)`
);
const insertLesson = db.prepare(
  `INSERT INTO lessons (course_id, title, content, order_index, points_value) VALUES (?, ?, ?, ?, ?)`
);

const existingCount = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
if (existingCount === 0) {
  db.exec('BEGIN');
  try {
    for (const course of courses) {
      const info = insertCourse.run(course.title, course.description, course.category, course.difficulty, course.tags, course.icon);
      const courseId = info.lastInsertRowid;
      course.lessons.forEach(([title, content, points], idx) => {
        insertLesson.run(courseId, title, content, idx + 1, points);
      });
    }
    db.exec('COMMIT');
    console.log(`Seeded ${courses.length} courses.`);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
} else {
  console.log('Courses already seeded, skipping.');
}

const badges = [
  ['First Steps', 'Complete your very first lesson', '🌱', 'lessons_completed', 1],
  ['Getting Momentum', 'Complete 5 lessons', '🚀', 'lessons_completed', 5],
  ['Dedicated Learner', 'Complete 15 lessons', '📚', 'lessons_completed', 15],
  ['On Fire', 'Keep a 3-day learning streak', '🔥', 'streak', 3],
  ['Unstoppable', 'Keep a 7-day learning streak', '⚡', 'streak', 7],
  ['Point Collector', 'Earn 100 points', '💎', 'points', 100],
  ['Course Finisher', 'Complete every lesson in a course', '🏆', 'course_completed', 1],
];

const insertBadge = db.prepare(
  `INSERT INTO badges (name, description, icon, criteria_type, criteria_value) VALUES (?, ?, ?, ?, ?)`
);
const existingBadges = db.prepare('SELECT COUNT(*) as c FROM badges').get().c;
if (existingBadges === 0) {
  db.exec('BEGIN');
  try {
    for (const b of badges) insertBadge.run(...b);
    db.exec('COMMIT');
    console.log(`Seeded ${badges.length} badges.`);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
} else {
  console.log('Badges already seeded, skipping.');
}

db.close();
console.log('Seed complete. Database at', DB_PATH);