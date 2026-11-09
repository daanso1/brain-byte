// Additive content expansion: adds new lessons to existing courses,
// lengthens existing lesson content, adds two brand-new courses, and
// adds new badges. Safe to run every startup — checks before inserting
// or updating anything, never duplicates, never touches user_progress.
const db = require('../config/db');

function getCourseIdByTitle(title) {
  const row = db.prepare('SELECT id FROM courses WHERE title = ?').get(title);
  return row ? row.id : null;
}

function updateLessonContent(courseId, title, newContent) {
  const existing = db.prepare('SELECT id FROM lessons WHERE course_id = ? AND title = ?').get(courseId, title);
  if (existing) {
    db.prepare('UPDATE lessons SET content = ? WHERE id = ?').run(newContent, existing.id);
  }
}

function addLessonIfMissing(courseId, title, content, orderIndex, points) {
  const existing = db.prepare('SELECT id FROM lessons WHERE course_id = ? AND title = ?').get(courseId, title);
  if (!existing) {
    db.prepare(
      'INSERT INTO lessons (course_id, title, content, order_index, points_value) VALUES (?, ?, ?, ?, ?)'
    ).run(courseId, title, content, orderIndex, points);
  }
}

function addCourseIfMissing(course) {
  let courseId = getCourseIdByTitle(course.title);
  if (!courseId) {
    const info = db.prepare(
      'INSERT INTO courses (title, description, category, difficulty, tags, icon) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(course.title, course.description, course.category, course.difficulty, course.tags, course.icon);
    courseId = info.lastInsertRowid;
  }
  course.lessons.forEach(([title, content, points], idx) => {
    addLessonIfMissing(courseId, title, content, idx + 1, points);
  });
}

// ---------- Lengthen existing lessons ----------
const lengthenedContent = [
  ['Digital Literacy Foundations', 'What is a computer?', `A computer is a device that takes input, processes it by following a set of instructions called a program, and produces output. Every app you use, from a calculator to a game to Brain Byte itself, is really just a very long list of precise instructions the computer follows one step at a time. Understanding this idea — input, processing, output — is the foundation for everything else you will learn about programming.`],
  ['Digital Literacy Foundations', 'Files, folders and storage', `Files hold data such as documents, photos, or code, and folders (also called directories) let you organise those files into a logical structure so you can find them again later. Storage can be local, meaning it lives physically on your device, or in the cloud, meaning it lives on a remote server and is accessed over the internet through services like Google Drive or Dropbox. Cloud storage has a major advantage for learners: it lets you access your files from any device with an internet connection, and it protects your work if your own device is lost, stolen, or damaged.`],
  ['Digital Literacy Foundations', 'Staying safe online', `Use strong, unique passwords for every account you own, since reusing the same password means a breach on one site can compromise all your accounts at once. Enable two-factor authentication (2FA) wherever it is offered, which requires a second proof of identity (like a code sent to your phone) even if someone steals your password. Never share your password with anyone, and be sceptical of unexpected links or attachments, even from people you know, since phishing remains the single most common way accounts get compromised.`],
  ['HTML & CSS Fundamentals', 'Structuring a page with HTML', `HTML (HyperText Markup Language) uses tags like h1, p, a and div to describe the structure and meaning of content on a page: headings, paragraphs, links, images and containers. Browsers read these tags and use them to render a visual page, but the tags themselves carry meaning beyond just appearance — a heading tag tells a screen reader or search engine that this is a heading, which matters for accessibility and SEO. Getting comfortable with a small set of core tags is enough to structure almost any simple web page.`],
  ['HTML & CSS Fundamentals', 'Styling with CSS', `CSS (Cascading Style Sheets) controls how HTML content looks: colour, spacing, fonts, borders and layout. You write rules that select elements — by tag name, by class, or by id — and then set properties on them, like color or margin. The cascading part of the name refers to how styles can come from multiple places and combine or override each other based on specificity and order, which is a common source of confusion for beginners but becomes intuitive with practice.`],
  ['HTML & CSS Fundamentals', 'Building a simple layout', `Flexbox and CSS Grid are two modern layout systems that let you arrange elements in rows, columns, and responsive grids without the older, hackier techniques developers used to rely on. Flexbox is ideal for laying out items in a single row or column that need to align, wrap, or share space intelligently. Grid is better suited to full two-dimensional page layouts. Learning to reach for the right tool for each situation is what separates a layout that mostly works from one that holds up cleanly on every screen size.`],
  ['JavaScript Basics', 'Variables and data types', `Variables store data using the let or const keywords, with const used when a value should never be reassigned and let used when it might change. JavaScript has several core data types: strings (text), numbers, booleans (true/false), arrays (ordered lists), and objects (collections of related key-value pairs). Understanding which type you are working with at any given moment is essential, since operations that work on one type often behave unexpectedly, or throw errors, on another.`],
  ['JavaScript Basics', 'Functions and logic', `Functions are reusable blocks of code that take inputs (called parameters), do some work, and often return a result. Combined with if/else statements and loops (for, while), functions let a program make decisions and repeat actions instead of writing the same code over and over. Breaking a large problem into small, well-named functions is one of the most important habits a new programmer can build, since it makes code both easier to test and easier to reason about later.`],
  ['JavaScript Basics', 'Responding to user actions', `Event listeners let JavaScript react when a user interacts with a page — clicking a button, typing in a text field, or submitting a form. This is the mechanism that turns a static page into an interactive application: you attach a listener to an element, and provide a function that runs whenever that event occurs. Nearly everything you interact with in a modern web app, including Brain Byte itself, is built on this same basic pattern repeated many times over.`],
  ['Python Programming Basics', 'Why Python?', `Python reads almost like plain English, which is a major reason it is often recommended as a first programming language — you can focus on learning programming concepts rather than fighting complicated syntax. It is used across a huge range of fields: web backends (as Brain Byte itself demonstrates), data analysis, automation of repetitive tasks, and artificial intelligence and machine learning, including the recommendation system built into this very platform. Because it is so widely used, Python skills transfer directly into many different career paths.`],
  ['Python Programming Basics', 'Variables, loops and conditionals', `Python uses indentation, rather than curly braces, to define code blocks, which enforces clean, readable formatting as part of the language itself. A for loop repeats an action a set number of times or once per item in a collection, a while loop repeats an action until a condition becomes false, and if/elif/else statements let a program branch and make decisions based on conditions. These three constructs, in combination, are powerful enough to express almost any program logic you will need as a beginner.`],
  ['Python Programming Basics', 'Writing your first functions', `A function in Python is defined with the def keyword, can accept input parameters, and can return a result using the return keyword. Writing functions lets you break a large, complex problem into small, independently testable pieces — instead of one long block of code, you get a set of clearly named building blocks that can be reused and combined. Good function design, including clear naming and a single well-defined responsibility per function, is one of the clearest markers of a growing programmer's skill.`],
  ['Version Control with Git', 'Why version control matters', `Git records a complete history of every change made to your code, which means you can undo mistakes, see exactly who changed what and when, and work on the same project as other people without accidentally overwriting anyone's work. Without version control, collaborative software projects would be nearly impossible to manage safely, and even solo projects benefit enormously from being able to roll back a change that turned out to be a mistake. Every professional software team uses some form of version control, almost always Git.`],
  ['Version Control with Git', 'Core Git commands', `The add command stages the changes you want to include in your next snapshot, the commit command saves that snapshot permanently to your project's history along with a descriptive message, and the push command uploads your committed changes to a remote repository such as GitHub so others (or your future self, on a different machine) can access them. These three commands, used together in sequence, form the core day-to-day workflow that almost every Git user relies on repeatedly.`],
  ['Version Control with Git', 'Branches and collaboration', `Branches let you work on a new feature or experiment without affecting the main, stable version of your codebase — you create a branch, make your changes there, and only merge it back into the main branch once it is ready and tested. This is exactly how professional teams (and well-organised solo developers) avoid breaking a working application while still making continuous progress. GitHub builds an entire collaboration workflow, called pull requests, around exactly this branch-and-merge pattern.`],
  ['Cybersecurity Essentials', 'Common attack types', `Phishing tricks people into giving up sensitive information, usually by impersonating a trusted source through email, text message, or a fake website. Malware is malicious software designed to harm, spy on, or take control of a device once it is installed. Social engineering is a broader category that manipulates human psychology — trust, urgency, fear — rather than technology, to gain unauthorised access. Understanding these categories helps you recognise an attack even when the specific technique is one you have not seen before.`],
  ['Cybersecurity Essentials', 'Passwords and authentication', `Password managers generate and store long, unique passwords for every account, removing the temptation to reuse a weak password across multiple sites. Two-factor authentication (2FA) adds a second layer of proof beyond just a password, dramatically reducing the risk of a compromised account even if the password itself is leaked in a data breach elsewhere. Together, these two habits are widely considered the single most effective, lowest-effort security improvement any individual can make.`],
  ['Cybersecurity Essentials', 'Thinking like a defender', `Good security design follows the principle of least privilege: give every person and every system only the access they strictly need to do their job, and nothing more. This limits the damage any single mistake, stolen credential, or compromised account can cause, since an attacker who gains access to one narrow part of a system cannot automatically reach everything else. Thinking this way, proactively, is what separates reactive security (patching problems after they happen) from genuinely resilient system design.`],
  ['Data & Spreadsheets for Everyone', 'Organising data in rows and columns', `Spreadsheets store data in a grid of rows and columns, and keeping exactly one type of information per column — a name, a date, an amount — is what makes it possible to sort, filter, and analyse that data reliably later on. Mixing different kinds of information into a single column (for example, putting both a name and a date in the same cell) is one of the most common mistakes beginners make, and it breaks almost every useful spreadsheet feature downstream.`],
  ['Data & Spreadsheets for Everyone', 'Formulas and functions', `Formulas such as SUM, AVERAGE and IF let a spreadsheet calculate results automatically instead of doing the maths by hand, and — critically — those results update instantly whenever the underlying data changes. This is the core superpower of a spreadsheet over a plain document: build the calculation once, correctly, and it stays correct as your data grows or changes, saving enormous amounts of repetitive manual work.`],
  ['Data & Spreadsheets for Everyone', 'Telling a story with charts', `A good chart should make one comparison or trend obvious at a glance, without requiring the reader to study a table of numbers first. Choosing the right chart type matters: bar charts are best for comparing distinct categories, line charts are best for showing a trend over time, and pie charts (used sparingly) are best for showing how parts make up a whole. A well-chosen chart can communicate an insight in seconds that a table of raw numbers would take minutes to convey.`],
];

lengthenedContent.forEach(([courseTitle, lessonTitle, content]) => {
  const courseId = getCourseIdByTitle(courseTitle);
  if (courseId) updateLessonContent(courseId, lessonTitle, content);
});

// ---------- Add two new lessons to each existing course ----------
const newLessonsForExistingCourses = [
  ['Digital Literacy Foundations', [
    ['Understanding operating systems', `An operating system (like Windows, macOS, or Linux) is the software that manages a computer's hardware and provides the environment every other program runs inside of. It handles tasks like managing memory, running multiple programs at once, and letting you interact with files through a visual interface. Understanding roughly what your operating system is doing behind the scenes makes troubleshooting far less mysterious when something goes wrong.`, 10],
    ['Digital communication etiquette', `Professional digital communication — email, Slack, WhatsApp for work purposes — has its own unwritten rules: clear subject lines, concise messages, and an appropriate tone for the audience. Getting this right matters especially when applying for jobs or communicating with potential employers, since a scattered or overly casual message can undermine an otherwise strong application before a human even reviews your skills.`, 10],
  ]],
  ['HTML & CSS Fundamentals', [
    ['Working with images and links', `The img tag embeds images using a src attribute pointing to the image file, and an alt attribute describing the image for accessibility and for cases where the image fails to load. The a tag creates hyperlinks using an href attribute pointing to the destination — internal pages within your own site, or external URLs elsewhere on the web. Together, images and links are what turn a page of plain text into a genuinely navigable, visual web experience.`, 10],
    ['Introduction to responsive design', `Responsive design means building a page that looks and works well across a wide range of screen sizes, from a small phone to a large desktop monitor, rather than assuming one fixed size. CSS media queries let you apply different styles depending on the screen width, and combined with Flexbox or Grid, they are the foundation of every modern, mobile-friendly website — including Brain Byte's own frontend.`, 15],
  ]],
  ['JavaScript Basics', [
    ['Working with arrays and objects', `Arrays store ordered lists of values (like a list of course names), while objects store related data as labelled key-value pairs (like a single course's title, category and difficulty together). Most real data you work with in JavaScript, including the API responses Brain Byte's own frontend receives, arrives as arrays of objects — so comfort with both structures is essential for building anything beyond the most trivial script.`, 15],
    ['Debugging your code', `Printing the value of a variable at a specific point using console.log lets you see exactly what your program is doing at that moment, and is the simplest, most widely used debugging tool. Browser developer tools (opened with F12) go further, letting you pause execution, step through code line by line, and inspect variables in real time. Learning to debug systematically, rather than guessing at fixes, is one of the most valuable skills a new developer can build.`, 15],
  ]],
  ['Python Programming Basics', [
    ['Working with lists and dictionaries', `Python lists store ordered collections of items and support operations like adding, removing, and looping through elements. Dictionaries store data as key-value pairs, similar to a real-world dictionary matching a word to its definition, and are ideal for representing structured records like a single user's profile information. Both are used constantly in real Python programs, including in the very recommendation logic this platform is built on.`, 15],
    ['Reading and writing files', `Python can read from and write to files on disk using the built-in open function, which is essential for tasks like processing a dataset, saving results, or building a simple data pipeline. Understanding file handling, including safely closing files after use, prevents subtle bugs like data loss or files being left locked by your program.`, 15],
  ]],
  ['Version Control with Git', [
    ['Resolving merge conflicts', `A merge conflict happens when Git cannot automatically combine two sets of changes to the same part of a file, usually because two people (or two branches) edited the exact same lines differently. Resolving a conflict means manually reviewing both versions and deciding what the final, correct code should be — a skill every collaborative developer eventually needs, and one that becomes far less intimidating with a little practice.`, 15],
    ['Writing good commit messages', `A good commit message clearly and concisely explains what changed and why, which becomes enormously valuable months later when you, or a teammate, need to understand the history of a project. The convention of starting with a short imperative summary line, like Fix login bug rather than fixed stuff, makes a project's history genuinely useful rather than a confusing timeline of vague notes.`, 10],
  ]],
  ['Cybersecurity Essentials', [
    ['Securing your home network', `Your home Wi-Fi router is the first line of defence for every device connected to it, so changing the default admin password, enabling WPA3 or WPA2 encryption, and keeping the router's firmware updated are all low-effort steps with a meaningful security payoff. Many successful attacks exploit routers that were never reconfigured from their insecure factory defaults.`, 10],
    ['Recognising social engineering', `Social engineering attacks succeed by exploiting human trust and urgency rather than technical vulnerabilities — a caller pretending to be from your bank, an urgent email demanding immediate action, or a stranger asking to borrow a work laptop. Recognising the emotional pressure tactics involved (urgency, authority, fear) is often more effective defence than any technical control, since these attacks are specifically designed to bypass technology by targeting people directly.`, 15],
  ]],
  ['Data & Spreadsheets for Everyone', [
    ['Sorting and filtering data', `Sorting rearranges rows based on the values in a chosen column (alphabetically, numerically, or by date), while filtering temporarily hides rows that do not match a chosen condition, without deleting any data. Mastering both makes it possible to quickly answer real questions from a large dataset without writing a single formula.`, 10],
    ['Introduction to pivot tables', `A pivot table summarises a large dataset by automatically grouping, counting, and aggregating values based on categories you choose — for example, total sales per region per month, generated in seconds from thousands of raw rows. Pivot tables are one of the most powerful, widely used features in any spreadsheet tool, and are considered a genuinely valuable, employable skill on their own.`, 15],
  ]],
];

newLessonsForExistingCourses.forEach(([courseTitle, lessons]) => {
  const courseId = getCourseIdByTitle(courseTitle);
  if (courseId) {
    const existingCount = db.prepare('SELECT COUNT(*) as c FROM lessons WHERE course_id = ?').get(courseId).c;
    lessons.forEach(([title, content, points], idx) => {
      addLessonIfMissing(courseId, title, content, existingCount + idx + 1, points);
    });
  }
});

// ---------- Two brand-new courses ----------
const newCourses = [
  {
    title: 'SQL & Databases Basics',
    description: 'Learn how real applications store and query data — the same kind of database powering Brain Byte itself.',
    category: 'Data', difficulty: 2, tags: 'sql,database,data,queries', icon: '🗄️',
    lessons: [
      ['What is a database?', `A database is a structured, organised collection of data designed to be efficiently stored, retrieved, and updated. Relational databases, like the SQLite database powering Brain Byte, organise data into tables made of rows and columns, with relationships defined between tables — for example, linking a lesson to the course it belongs to. Understanding this structure is the foundation for everything else in working with data professionally.`, 10],
      ['Writing your first SELECT query', `The SELECT statement is how you retrieve data from a database table: selecting the title column from every row in the courses table, for example. Adding a WHERE clause lets you filter which rows come back, so you could retrieve only beginner-level courses by filtering on difficulty. This single statement, in its many variations, is used more than almost any other piece of SQL in real-world work.`, 15],
      ['Filtering and sorting results', `Beyond a basic WHERE clause, SQL supports combining conditions with AND and OR, and sorting results with ORDER BY, either ascending or descending. LIMIT restricts how many rows come back, which is essential when working with large, real-world datasets where returning every row at once would be impractical. Together, these tools let you ask precise, targeted questions of even a very large dataset.`, 15],
      ['Joining multiple tables', `A JOIN combines rows from two or more tables based on a related column, such as matching each lesson to its parent course through a shared course id. This is the single most powerful and distinctive feature of relational databases: instead of duplicating a course's title into every one of its lessons, you store it once and join it in whenever needed, keeping the data consistent and much smaller.`, 20],
      ['Inserting and updating data', `INSERT adds new rows to a table, while UPDATE modifies existing rows that match a WHERE condition — the exact operations Brain Byte's own backend performs every time someone registers or completes a lesson. Being careful and precise with the WHERE clause on an UPDATE is critical, since an UPDATE without one will apply the change to every single row in the table.`, 15],
    ],
  },
  {
    title: 'Preparing for a Tech Career',
    description: 'Practical, employability-focused skills to help you land your first role in tech.',
    category: 'Career', difficulty: 1, tags: 'career,cv,interview,portfolio', icon: '💼',
    lessons: [
      ['Building a tech CV', `A strong entry-level tech CV highlights concrete, demonstrable skills and projects rather than vague claims — listing a specific project built with specific technologies is far more convincing to an employer than simply writing that you are hard-working and passionate about technology. Keep it to one page where possible, and tailor the skills you highlight to match the specific role you are applying for.`, 10],
      ['Creating a GitHub portfolio', `A public GitHub profile showing real projects, even small ones, gives employers concrete evidence of your skills that a CV alone cannot — many hiring managers in tech look at a candidate's GitHub before, or instead of, a formal interview. A clear README file explaining what each project does and how to run it dramatically increases how impressive a project appears to someone reviewing it quickly.`, 15],
      ['Acing a technical interview', `Technical interviews often include both conceptual questions and practical coding exercises. Talking through your thought process out loud, even when stuck, is usually valued more highly than silently arriving at a perfect answer, since it shows the interviewer how you actually think through a problem — a skill that matters more on the job than memorised solutions.`, 15],
      ['Networking in the tech industry', `Many entry-level tech opportunities are found through networking — LinkedIn connections, local meetups, hackathons, and online developer communities — rather than through cold job applications alone. Genuinely engaging with a community, by asking questions, sharing what you are building, and helping others, tends to open more doors over time than simply broadcasting that you are looking for work.`, 10],
      ['Finding entry-level opportunities in South Africa', `South Africa has a growing number of pathways into tech careers specifically aimed at people without a traditional university background, including learnerships, bootcamps, and graduate programmes run by major banks and telecoms companies as part of their skills-development commitments. Researching these programmes directly, rather than relying only on general job boards, often surfaces opportunities specifically designed for candidates in exactly this situation.`, 10],
    ],
  },
];

newCourses.forEach(addCourseIfMissing);

console.log('Content expansion complete: lessons enriched, new courses/lessons added where missing.');

// ---------- Expanded badge list ----------
const expandedBadges = [
  ['First Steps', 'Complete your very first lesson', '🌱', 'lessons_completed', 1],
  ['Getting Momentum', 'Complete 5 lessons', '🚀', 'lessons_completed', 5],
  ['Dedicated Learner', 'Complete 15 lessons', '📚', 'lessons_completed', 15],
  ['Knowledge Seeker', 'Complete 30 lessons', '🔎', 'lessons_completed', 30],
  ['Master Learner', 'Complete 50 lessons', '🎓', 'lessons_completed', 50],
  ['On Fire', 'Keep a 3-day learning streak', '🔥', 'streak', 3],
  ['Unstoppable', 'Keep a 7-day learning streak', '⚡', 'streak', 7],
  ['Streak Legend', 'Keep a 14-day learning streak', '🌟', 'streak', 14],
  ['Streak Champion', 'Keep a 30-day learning streak', '👑', 'streak', 30],
  ['Point Collector', 'Earn 100 points', '💎', 'points', 100],
  ['Rising Star', 'Earn 250 points', '✨', 'points', 250],
  ['Point Master', 'Earn 500 points', '💠', 'points', 500],
  ['Byte Legend', 'Earn 1000 points', '🏅', 'points', 1000],
  ['Course Finisher', 'Complete every lesson in a course', '🏆', 'course_completed', 1],
  ['Course Collector', 'Complete 3 full courses', '📦', 'course_completed', 3],
];

const insertBadge = db.prepare(
  'INSERT INTO badges (name, description, icon, criteria_type, criteria_value) VALUES (?, ?, ?, ?, ?)'
);
let addedBadges = 0;
expandedBadges.forEach(([name, description, icon, criteria_type, criteria_value]) => {
  const existing = db.prepare('SELECT id FROM badges WHERE name = ?').get(name);
  if (!existing) {
    insertBadge.run(name, description, icon, criteria_type, criteria_value);
    addedBadges++;
  }
});
if (addedBadges > 0) console.log(`Added ${addedBadges} new badge(s).`);

module.exports = {};