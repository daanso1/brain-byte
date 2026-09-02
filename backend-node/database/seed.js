// Seeds the Brain Byte database with starter courses, lessons and badges.
// Run with: node database/seed.js
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'brainbyte.db');
const db = new Database(DB_PATH);

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

const courses = [
  {
    title: 'Digital Literacy Foundations',
    description: 'Get comfortable with computers, the internet, email and online safety — the starting point for everything else.',
    category: 'Foundations',
    difficulty: 1,
    tags: 'computers,internet,email,files,safety',
    icon: '💻',
    lessons: [
      ['What is a computer?', 'A computer is a device that takes input, processes it following instructions (a program), and produces output. Every app you use, from a calculator to a game, is just instructions the computer follows step by step.', 10],
      ['Files, folders and storage', 'Files hold data (documents, photos, code). Folders organise files. Storage can be local (your device) or in the cloud (Google Drive, Dropbox), which lets you access files from any device with internet.', 10],
      ['Staying safe online', 'Use strong, unique passwords, enable two-factor authentication where possible, never share your password, and be sceptical of links or attachments from people you do not know — phishing is the most common way accounts get hacked.', 15],
    ],
  },
  {
    title: 'HTML & CSS Fundamentals',
    description: 'Build your first web pages: structure content with HTML and style it with CSS.',
    category: 'Web Development',
    difficulty: 1,
    tags: 'html,css,web,frontend,markup,styling',
    icon: '🌐',
    lessons: [
      ['Structuring a page with HTML', 'HTML uses tags like <h1>, <p> and <div> to describe the structure of a page: headings, paragraphs, links and containers. Browsers read these tags and render them as a visual page.', 10],
      ['Styling with CSS', 'CSS controls how HTML looks: colour, spacing, fonts and layout. You select elements (by tag, class or id) and set properties like color, margin and font-size.', 10],
      ['Building a simple layout', 'Flexbox and Grid let you arrange elements in rows, columns and responsive layouts, so a page looks right on both a phone and a laptop.', 15],
    ],
  },
  {
    title: 'JavaScript Basics',
    description: 'Learn the language that makes web pages interactive: variables, functions, and responding to clicks.',
    category: 'Programming',
    difficulty: 2,
    tags: 'javascript,programming,logic,functions,web',
    icon: '⚡',
    lessons: [
      ['Variables and data types', 'Variables store data using let or const. JavaScript has types like strings (text), numbers, booleans (true/false), and objects that group related data together.', 10],
      ['Functions and logic', 'Functions are reusable blocks of code. Combined with if-statements and loops, they let a program make decisions and repeat actions instead of writing the same code over and over.', 15],
      ['Responding to user actions', 'Event listeners let JavaScript react when a user clicks a button or types in a box, which is how static pages become interactive applications.', 15],
    ],
  },
  {
    title: 'Python Programming Basics',
    description: 'A beginner-friendly introduction to Python — one of the most in-demand languages for data, automation and backend development.',
    category: 'Programming',
    difficulty: 1,
    tags: 'python,programming,logic,automation',
    icon: '🐍',
    lessons: [
      ['Why Python?', 'Python reads almost like plain English, which makes it a popular first language. It is used for web backends, data analysis, automation and artificial intelligence.', 10],
      ['Variables, loops and conditionals', 'Python uses indentation (not curly braces) to define code blocks. for and while loops repeat actions, and if/elif/else statements make decisions.', 15],
      ['Writing your first functions', 'A function in Python is defined with def, takes inputs (parameters), and can return a result — this is how you break a big problem into small, testable pieces.', 15],
    ],
  },
  {
    title: 'Version Control with Git',
    description: 'Track changes to your code and collaborate with others using Git and GitHub — an essential skill for any developer job.',
    category: 'Tools',
    difficulty: 2,
    tags: 'git,github,collaboration,version control',
    icon: '🔧',
    lessons: [
      ['Why version control matters', 'Git records a history of every change to your code, so you can undo mistakes, see who changed what, and work on the same project as other people without overwriting each other\u2019s work.', 10],
      ['Core Git commands', 'git add stages changes, git commit saves a snapshot with a message, and git push uploads your commits to a remote repository like GitHub.', 15],
      ['Branches and collaboration', 'Branches let you work on a new feature without affecting the main codebase; when it is ready, you merge it back in — this is how teams work on the same project safely.', 15],
    ],
  },
  {
    title: 'Cybersecurity Essentials',
    description: 'Understand the most common digital threats and how to defend against them, for yourself and future employers.',
    category: 'Cybersecurity',
    difficulty: 2,
    tags: 'security,cybersecurity,privacy,networks',
    icon: '🔒',
    lessons: [
      ['Common attack types', 'Phishing tricks people into giving up information; malware is malicious software that harms or spies on a device; social engineering manipulates people rather than technology to gain access.', 15],
      ['Passwords and authentication', 'Password managers and two-factor authentication (2FA) dramatically reduce the risk of an account being compromised, even if a password is leaked elsewhere.', 10],
      ['Thinking like a defender', 'Good security follows the principle of least privilege: give people and systems only the access they need, nothing more, to limit the damage of any single mistake or breach.', 15],
    ],
  },
  {
    title: 'Data & Spreadsheets for Everyone',
    description: 'Use spreadsheets to organise, analyse and present data — a practical skill useful in almost every job.',
    category: 'Data',
    difficulty: 1,
    tags: 'data,spreadsheets,excel,analysis',
    icon: '📊',
    lessons: [
      ['Organising data in rows and columns', 'Spreadsheets store data in a grid of rows and columns. Keeping one type of information per column (a name, a date, an amount) makes it possible to sort, filter and analyse later.', 10],
      ['Formulas and functions', 'Formulas like SUM, AVERAGE and IF let a spreadsheet calculate results automatically instead of by hand, and update instantly when the underlying data changes.', 15],
      ['Telling a story with charts', 'A chart should make one comparison obvious at a glance. Choosing the right chart type (bar for comparison, line for trend over time) makes data easier to understand than a table of numbers.', 10],
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
  const insertAll = db.transaction((courses) => {
    for (const course of courses) {
      const info = insertCourse.run(
        course.title, course.description, course.category, course.difficulty, course.tags, course.icon
      );
      const courseId = info.lastInsertRowid;
      course.lessons.forEach(([title, content, points], idx) => {
        insertLesson.run(courseId, title, content, idx + 1, points);
      });
    }
  });
  insertAll(courses);
  console.log(`Seeded ${courses.length} courses.`);
} else {
  console.log('Courses already seeded, skipping course seed.');
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
  const insertAllBadges = db.transaction((badges) => {
    for (const b of badges) insertBadge.run(...b);
  });
  insertAllBadges(badges);
  console.log(`Seeded ${badges.length} badges.`);
} else {
  console.log('Badges already seeded, skipping.');
}

db.close();
console.log('Seed complete. Database at', DB_PATH);
