// Adds: in-depth course details, a 5-question quiz for every course, the tables
// the admin course tools need, and rebalances the position of the correct
// answer in the existing lesson quizzes.
//
// Safe to run on every startup: each step checks before it changes anything,
// never deletes data, and is wrapped so a problem can never stop the server
// from starting.
const db = require('../config/db');

function step(name, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[courseFeatures] "${name}" failed (server keeps running):`, err.message);
  }
}

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

function addColumn(table, column, definition) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Migration: added ${column} column to ${table} table.`);
  }
}

function getMeta(key) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setMeta(key, value) {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value);
}

// ---------------------------------------------------------------------------
// 1. Tables and columns
// ---------------------------------------------------------------------------
step('create tables', () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS course_questions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      question      TEXT NOT NULL,
      options       TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS course_quiz_results (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      best_score      INTEGER NOT NULL DEFAULT 0,
      attempts        INTEGER NOT NULL DEFAULT 0,
      passed          INTEGER NOT NULL DEFAULT 0,
      points_awarded  INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT,
      UNIQUE(user_id, course_id)
    );
  `);
});

step('add course detail columns', () => {
  addColumn('courses', 'overview', 'TEXT');
  addColumn('courses', 'learning_outcomes', 'TEXT');
  addColumn('courses', 'prerequisites', 'TEXT');
  addColumn('courses', 'estimated_hours', 'INTEGER');
});

// ---------------------------------------------------------------------------
// 2. In-depth course details (only fills courses that have none yet, so
//    anything an admin edits later is never overwritten)
// ---------------------------------------------------------------------------
const COURSE_DETAILS = [
  [
    `Digital Literacy Foundations`,
    `This course is the starting point for everything else on Brain Byte. You will learn how computers actually work, how to organise and protect your files, how to move around an operating system with confidence, and how to communicate professionally online. No prior experience is needed: if you can open a web browser, you can start here. By the end you will be comfortable enough with technology to learn programming, web design or data skills without feeling lost.`,
    [
      `Explain in plain language how a computer takes input, processes it and produces output`,
      `Organise files and folders and choose between local and cloud storage`,
      `Recognise phishing and use strong, unique passwords with two-factor authentication`,
      `Describe the role of an operating system and navigate one confidently`,
      `Write clear, professional emails and messages for study and work`,
    ],
    `None. You only need access to a device with a web browser.`,
    4,
  ],
  [
    `HTML & CSS Fundamentals`,
    `Every website you have ever visited is built from HTML and CSS. In this course you will learn how HTML gives a page its structure and meaning, how CSS controls colour, spacing and layout, and how to make pages that work on both a phone and a laptop. You will finish with the skills to build and style a simple multi-section web page yourself, which is the foundation of front-end development.`,
    [
      `Structure a web page using headings, paragraphs, links, images and containers`,
      `Style elements with CSS selectors, colours, fonts and spacing`,
      `Build flexible layouts with Flexbox and CSS Grid`,
      `Add images and links with accessible alternative text`,
      `Use media queries to make a page responsive on small screens`,
    ],
    `Digital Literacy Foundations is helpful but not required.`,
    6,
  ],
  [
    `JavaScript Basics`,
    `JavaScript is the language that makes web pages interactive. It powers the buttons, quizzes and dashboards on Brain Byte itself. This course introduces the core ideas of programming (variables, data types, functions, decisions and loops) and shows you how to respond to user actions in the browser. You will also learn how to find and fix bugs, an essential skill for every developer.`,
    [
      `Store and manipulate data using variables and the core data types`,
      `Write reusable functions and use if statements and loops to control program flow`,
      `Work with arrays and objects to represent real-world data`,
      `Respond to clicks and other user actions using event listeners`,
      `Debug code using console.log and the browser developer tools`,
    ],
    `HTML & CSS Fundamentals is recommended.`,
    8,
  ],
  [
    `Python Programming Basics`,
    `Python is one of the most widely used programming languages in the world, valued for its readable syntax. It is used for web back ends, data analysis, automation and artificial intelligence, including the recommendation logic behind this platform. In this course you will learn the fundamentals: variables, loops, conditionals, functions, lists, dictionaries and working with files.`,
    [
      `Write Python programs using variables, loops and conditional statements`,
      `Define and call functions to break problems into small, reusable pieces`,
      `Store and process data with lists and dictionaries`,
      `Read from and write to files safely`,
      `Explain where Python is used across industries and career paths`,
    ],
    `None, although Digital Literacy Foundations helps.`,
    8,
  ],
  [
    `Version Control with Git`,
    `Git is the tool professional developers use to track every change to their code and to collaborate without overwriting each other's work. This course explains why version control matters, walks through the core commands, and introduces branches, merge conflicts and good commit messages. These are skills employers expect from day one, and they make a GitHub portfolio look professional.`,
    [
      `Explain what version control is and why every software team uses it`,
      `Stage, commit and push changes using the core Git commands`,
      `Create and merge branches to work on features safely`,
      `Resolve a simple merge conflict`,
      `Write clear commit messages that make a project history useful`,
    ],
    `Basic comfort with a computer and files. Some coding experience is helpful.`,
    4,
  ],
  [
    `Cybersecurity Essentials`,
    `Cybersecurity is about protecting people, data and systems from harm. This course introduces the most common attack types (phishing, malware and social engineering) and the everyday habits that defend against them, from password managers and two-factor authentication to securing your home network. You will also learn the defender's mindset, including the principle of least privilege.`,
    [
      `Identify phishing, malware and social engineering attempts`,
      `Set up strong authentication using a password manager and 2FA`,
      `Secure a home Wi-Fi network with sensible router settings`,
      `Explain the principle of least privilege and why it limits damage`,
      `Recognise the pressure tactics attackers use and how to resist them`,
    ],
    `Digital Literacy Foundations is recommended.`,
    5,
  ],
  [
    `Data & Spreadsheets for Everyone`,
    `Spreadsheets are one of the most useful workplace skills in almost every industry. You will learn to organise data cleanly in rows and columns, calculate results with formulas, sort and filter large lists, summarise data with pivot tables, and present findings with clear charts. These skills are valuable on their own and also prepare you for data analysis and database work.`,
    [
      `Structure data with one type of information per column`,
      `Use formulas such as SUM, AVERAGE and IF to automate calculations`,
      `Sort and filter data to answer real questions`,
      `Summarise large datasets with pivot tables`,
      `Choose the right chart type to communicate a clear message`,
    ],
    `None.`,
    5,
  ],
  [
    `SQL & Databases Basics`,
    `Almost every application stores its information in a database, including Brain Byte, which uses a relational database to store users, courses and progress. In this course you will learn how relational databases are organised and how to ask them questions using SQL: selecting, filtering, sorting and joining data, and safely inserting and updating records.`,
    [
      `Explain what a relational database is and how tables relate to each other`,
      `Retrieve data with SELECT and refine it using WHERE, ORDER BY and LIMIT`,
      `Combine related tables with JOIN`,
      `Add and change data with INSERT and UPDATE, using WHERE safely`,
      `Describe why good database design avoids duplicating data`,
    ],
    `Data & Spreadsheets for Everyone is a helpful introduction.`,
    6,
  ],
  [
    `Preparing for a Tech Career`,
    `Skills get you ready; presentation gets you hired. This course focuses on the practical steps between learning and earning: building a strong entry-level CV, creating a GitHub portfolio that proves your skills, preparing for technical interviews, networking in the tech community, and finding the learnerships, bootcamps and graduate programmes aimed at people without a traditional degree in South Africa.`,
    [
      `Write a one-page tech CV that highlights real projects and skills`,
      `Create a GitHub portfolio with clear README files`,
      `Explain your thought process confidently in a technical interview`,
      `Use networking and online communities to find opportunities`,
      `Research learnerships, bootcamps and graduate programmes in South Africa`,
    ],
    `Best taken after completing at least one technical course.`,
    3,
  ],
];

step('fill course details', () => {
  const fill = db.prepare(
    `UPDATE courses SET overview = ?, learning_outcomes = ?, prerequisites = ?, estimated_hours = ?
     WHERE id = ? AND (overview IS NULL OR overview = '')`
  );
  COURSE_DETAILS.forEach(([title, overview, outcomes, prerequisites, hours]) => {
    const course = db.prepare('SELECT id FROM courses WHERE title = ?').get(title);
    if (course) fill.run(overview, JSON.stringify(outcomes), prerequisites, hours, course.id);
  });
});

// ---------------------------------------------------------------------------
// 3. Course quiz questions: [question, correct answer, [three wrong answers]]
//    The correct answer is placed in a different position for each question.
// ---------------------------------------------------------------------------
const COURSE_QUESTIONS = {
  'Digital Literacy Foundations': [
    [`Which sequence correctly describes how a computer works?`, `Input, processing, output`, [`Output, storage, input`, `Processing, deletion, saving`, `Download, upload, install`]],
    [`What is a key advantage of storing files in the cloud?`, `You can reach them from any device with an internet connection`, [`They can never be deleted`, `They do not need any account or password`, `They always load faster than files on your own device`]],
    [`Which is the strongest account security practice?`, `A unique password for each account plus two-factor authentication`, [`One memorable password used on every site`, `Sharing your password only with close friends`, `Changing your password only when someone asks`]],
    [`What does an operating system do?`, `Manages the hardware and lets other programs run`, [`Only protects the computer from viruses`, `Only stores your photos and documents`, `Only connects the computer to the internet`]],
    [`Which email subject line is most professional when applying for a job?`, `Application for Junior IT Support Position: T. Mokoena`, [`hey!!!`, `Please read ASAP`, `Job`]],
  ],
  'HTML & CSS Fundamentals': [
    [`What is the main purpose of HTML?`, `To describe the structure and meaning of page content`, [`To control colours and animations only`, `To store user data on a server`, `To send emails automatically`]],
    [`Which CSS feature lets a page adapt to different screen widths?`, `Media queries`, [`Comments`, `Hyperlinks`, `Doctype declarations`]],
    [`What is the alt attribute on an image used for?`, `A text description for accessibility and for when the image fails to load`, [`Changing the image size`, `Linking the image to another page`, `Choosing the image file format`]],
    [`Which two CSS layout systems are commonly used to build modern responsive layouts?`, `Flexbox and Grid`, [`Tables and framesets`, `Cookies and sessions`, `Selectors and comments`]],
    [`In CSS, what does a selector do?`, `Chooses which HTML elements a style rule applies to`, [`Downloads fonts from the internet`, `Checks the page for spelling errors`, `Saves the page to the server`]],
  ],
  'JavaScript Basics': [
    [`Which keyword declares a variable whose value should not be reassigned?`, `const`, [`let`, `static`, `final`]],
    [`What is a function in JavaScript?`, `A reusable block of code that can take inputs and return a result`, [`A permanent storage location for files`, `A style rule for a web page`, `A type of database table`]],
    [`How do you make JavaScript react when a user clicks a button?`, `Attach an event listener to the button`, [`Rename the button in CSS`, `Add a comment above the button`, `Reload the whole page every second`]],
    [`What does a JavaScript object store?`, `Related data as key-value pairs`, [`Only a single number`, `Only images`, `Only true or false values`]],
    [`What is a simple way to inspect a variable while debugging?`, `Print it with console.log`, [`Delete the line that uses it`, `Restart the computer`, `Rewrite the whole program`]],
  ],
  'Python Programming Basics': [
    [`What does Python use to define blocks of code?`, `Indentation`, [`Curly braces`, `Semicolons`, `Angle brackets`]],
    [`Which keyword defines a function in Python?`, `def`, [`function`, `fun`, `define`]],
    [`Which Python structure stores key-value pairs?`, `A dictionary`, [`A comment`, `A loop`, `An import statement`]],
    [`Which loop repeats an action until a condition becomes false?`, `while`, [`if`, `def`, `import`]],
    [`Which built-in function opens a file in Python?`, `open()`, [`read_all()`, `load_file()`, `start()`]],
  ],
  'Version Control with Git': [
    [`What is the main benefit of using Git?`, `It records the full history of changes and supports collaboration`, [`It writes your code automatically`, `It makes programs run faster`, `It removes the need for testing`]],
    [`Which command saves a snapshot of your staged changes to the project history?`, `git commit`, [`git push`, `git clone`, `git status`]],
    [`Why do developers create branches?`, `To work on changes without affecting the main code`, [`To delete old files permanently`, `To speed up the internet connection`, `To hide the project from others`]],
    [`When does a merge conflict occur?`, `When two changes edit the same lines in different ways`, [`Whenever you create a repository`, `Whenever you run git status`, `Only when the internet is offline`]],
    [`Which commit message is best?`, `Fix login error when the password is empty`, [`stuff`, `asdf`, `final final 2`]],
  ],
  'Cybersecurity Essentials': [
    [`What is phishing?`, `Tricking people into revealing sensitive information`, [`A tool that speeds up your Wi-Fi`, `A type of password manager`, `A backup method for files`]],
    [`What does two-factor authentication add?`, `A second proof of identity beyond your password`, [`A faster way to log in without a password`, `Automatic virus removal`, `A longer password`]],
    [`What does the principle of least privilege mean?`, `Give people only the access they need`, [`Give everyone full administrator access`, `Remove all passwords`, `Share one account across a whole team`]],
    [`Which action improves home Wi-Fi security?`, `Changing the router's default admin password`, [`Leaving all default settings unchanged`, `Sharing the Wi-Fi password publicly`, `Turning off all updates`]],
    [`Social engineering attacks mainly exploit what?`, `Human trust and pressure such as urgency or fear`, [`Only hardware faults`, `Only outdated printers`, `Only weak Wi-Fi signals`]],
  ],
  'Data & Spreadsheets for Everyone': [
    [`What should each spreadsheet column contain?`, `One consistent type of information`, [`A mix of names, dates and amounts`, `Only numbers`, `Only formulas`]],
    [`What is a major benefit of using formulas?`, `Results update automatically when the data changes`, [`They stop you from entering any data`, `They only work once`, `They hide the original data`]],
    [`What does filtering do to a data set?`, `Temporarily hides rows that do not match a condition`, [`Permanently deletes unmatched rows`, `Changes every value to zero`, `Merges all columns into one`]],
    [`What does a pivot table do?`, `Summarises and groups large data automatically`, [`Rotates the spreadsheet on the screen`, `Converts text into images`, `Checks spelling in cells`]],
    [`Which chart type is best for showing a trend over time?`, `Line chart`, [`Pie chart`, `Organisation chart`, `Venn diagram`]],
  ],
  'SQL & Databases Basics': [
    [`What do relational databases organise data into?`, `Tables made of rows and columns`, [`One large text document`, `Folders of images`, `A single long list`]],
    [`Which SQL keyword retrieves data from a table?`, `SELECT`, [`REMOVE`, `FETCHALL`, `PULL`]],
    [`Which clause filters which rows are returned?`, `WHERE`, [`ORDER BY`, `LIMIT`, `GROUP BY`]],
    [`What does a JOIN do?`, `Combines rows from related tables`, [`Deletes a table`, `Encrypts a column`, `Creates a backup file`]],
    [`What happens if you run an UPDATE statement without a WHERE clause?`, `Every row in the table is changed`, [`Nothing happens`, `Only the first row is changed`, `The table is deleted`]],
  ],
  'Preparing for a Tech Career': [
    [`What makes an entry-level tech CV more convincing?`, `Specific projects and skills you can demonstrate`, [`Vague claims such as being hard-working`, `As many pages as possible`, `Leaving out your skills`]],
    [`Why is a GitHub portfolio useful to job seekers?`, `It gives employers real evidence of your skills`, [`It replaces the need for any interview`, `It is only for designers`, `It hides your work from employers`]],
    [`What do interviewers often value in a technical interview?`, `Hearing your thought process, even when you are stuck`, [`Complete silence while you work`, `Memorised answers only`, `Refusing questions you are unsure about`]],
    [`How are many entry-level tech opportunities found?`, `Through networking and community involvement`, [`Only through newspaper adverts`, `Only through cold applications`, `By avoiding online communities`]],
    [`Which is an example of a pathway into tech for people without a university degree?`, `A learnership or bootcamp`, [`Only postgraduate research`, `Only unpaid work overseas`, `There are none in South Africa`]],
  ],
};

step('seed course quiz questions', () => {
  const insert = db.prepare(
    'INSERT INTO course_questions (course_id, question, options, correct_index) VALUES (?, ?, ?, ?)'
  );
  Object.entries(COURSE_QUESTIONS).forEach(([title, items], courseIdx) => {
    const course = db.prepare('SELECT id FROM courses WHERE title = ?').get(title);
    if (!course) return;

    const flag = `course_questions_seeded:${title}`;
    if (getMeta(flag)) return;

    const existing = db.prepare('SELECT COUNT(*) AS c FROM course_questions WHERE course_id = ?').get(course.id).c;
    if (existing === 0) {
      db.exec('BEGIN');
      try {
        items.forEach(([question, correct, wrong], qi) => {
          const position = (qi * 3 + courseIdx) % 4;
          const options = wrong.slice();
          options.splice(position, 0, correct);
          insert.run(course.id, question, JSON.stringify(options), position);
        });
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    }
    setMeta(flag, '1');
  });
});

// ---------------------------------------------------------------------------
// 4. The first lesson quizzes all had the correct answer in position 1.
//    Move it to a varied position (runs once).
// ---------------------------------------------------------------------------
step('rebalance lesson quiz answers', () => {
  if (getMeta('lesson_quiz_rebalanced')) return;
  if (!columnExists('lessons', 'quiz_options') || !columnExists('lessons', 'quiz_correct_index')) return;

  const lessons = db
    .prepare('SELECT id, quiz_options FROM lessons WHERE quiz_options IS NOT NULL AND quiz_correct_index = 0')
    .all();
  const update = db.prepare('UPDATE lessons SET quiz_options = ?, quiz_correct_index = ? WHERE id = ?');

  db.exec('BEGIN');
  try {
    lessons.forEach((lesson) => {
      let options;
      try { options = JSON.parse(lesson.quiz_options); } catch (e) { return; }
      if (!Array.isArray(options) || options.length !== 4) return;
      const position = (lesson.id + 2) % 4;
      const correct = options[0];
      const others = options.slice(1);
      others.splice(position, 0, correct);
      update.run(JSON.stringify(others), position, lesson.id);
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  setMeta('lesson_quiz_rebalanced', '1');
  console.log('Lesson quiz answers rebalanced.');
});

console.log('Course features ready.');

module.exports = {};