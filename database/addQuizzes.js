// Adds a quiz question to each lesson so completion requires answering
// correctly, not just clicking a button. Safe to run every startup —
// only fills in quiz fields that are currently empty (NULL), so it
// will never overwrite a quiz an admin has customised later.
const db = require('../config/db');

function setQuizIfMissing(title, question, options, correctIndex) {
  const lesson = db.prepare('SELECT id, quiz_question FROM lessons WHERE title = ?').get(title);
  if (!lesson) return;
  if (lesson.quiz_question) return; // already has a quiz, don't overwrite

  db.prepare(
    'UPDATE lessons SET quiz_question = ?, quiz_options = ?, quiz_correct_index = ? WHERE id = ?'
  ).run(question, JSON.stringify(options), correctIndex, lesson.id);
}

const quizzes = [
  ['What is a computer?', `What best describes what a computer does?`, [`Takes input, processes it, and produces output`, `Only stores files`, `Only connects to the internet`, `Only runs one specific operating system`], 0],
  ['Files, folders and storage', `What is the main benefit of cloud storage?`, [`You can access your files from any device with an internet connection`, `It is always faster than local storage`, `It never requires an account`, `It automatically deletes old files`], 0],
  ['Staying safe online', `What does two-factor authentication (2FA) add?`, [`A second proof of identity beyond your password`, `A faster login process`, `A way to skip using a password entirely`, `Nothing extra, it is just a backup password`], 0],
  ['Understanding operating systems', `What is the main job of an operating system?`, [`Managing hardware and running other programs`, `Only browsing the internet`, `Only playing games`, `Only writing documents`], 0],
  ['Digital communication etiquette', `What matters most in professional digital communication?`, [`Clear, concise messages with an appropriate tone`, `Using as many emojis as possible`, `Writing extremely long messages`, `Never using a subject line`], 0],

  ['Structuring a page with HTML', `What does HTML primarily describe?`, [`The structure and meaning of page content`, `Only colours and fonts`, `Database queries`, `Server-side logic`], 0],
  ['Styling with CSS', `What does CSS control?`, [`How HTML content looks: colour, spacing, fonts, layout`, `The structure of a database`, `Server-side logic`, `User authentication`], 0],
  ['Building a simple layout', `Which two CSS tools are commonly used for modern responsive layouts?`, [`Flexbox and Grid`, `Tables and Frames`, `JavaScript and PHP`, `SQL and JSON`], 0],
  ['Working with images and links', `Which HTML attribute describes an image for accessibility?`, [`alt`, `src`, `href`, `class`], 0],
  ['Introduction to responsive design', `What lets you apply different CSS styles based on screen width?`, [`Media queries`, `Cookies`, `Local storage`, `JSON`], 0],

  ['Variables and data types', `Which keyword should you use for a variable that will never be reassigned?`, [`const`, `let`, `var only`, `function`], 0],
  ['Functions and logic', `What do functions let you do?`, [`Reuse blocks of code with inputs and outputs`, `Only style a webpage`, `Only store data permanently`, `Only connect to a database`], 0],
  ['Responding to user actions', `What lets JavaScript react to a button click?`, [`Event listeners`, `CSS variables`, `SQL queries`, `HTML tags alone`], 0],
  ['Working with arrays and objects', `What does a JavaScript object store?`, [`Related data as key-value pairs`, `Only numbers in order`, `Only images`, `Only true/false values`], 0],
  ['Debugging your code', `What is a simple, widely-used way to see what your program is doing?`, [`console.log()`, `Deleting the code`, `Ignoring the error`, `Restarting your computer`], 0],

  ['Why Python?', `Why is Python often recommended as a first programming language?`, [`It reads almost like plain English`, `It requires no computer to run`, `It only works for making games`, `It has no real-world uses`], 0],
  ['Variables, loops and conditionals', `What does Python use instead of curly braces to define code blocks?`, [`Indentation`, `Semicolons`, `Square brackets`, `Quotation marks`], 0],
  ['Writing your first functions', `Which keyword defines a function in Python?`, [`def`, `function`, `func`, `define`], 0],
  ['Working with lists and dictionaries', `What does a Python dictionary store?`, [`Key-value pairs`, `Only ordered numbers`, `Only files`, `Only true/false values`], 0],
  ['Reading and writing files', `Which built-in function opens a file in Python?`, [`open()`, `read()`, `file()`, `load()`], 0],

  ['Why version control matters', `What is the main benefit of using Git?`, [`It records a full history of every change`, `It automatically writes your code for you`, `It only works alone, never in teams`, `It deletes old versions of files`], 0],
  ['Core Git commands', `Which command saves a snapshot of staged changes?`, [`git commit`, `git push`, `git clone`, `git delete`], 0],
  ['Branches and collaboration', `What is a Git branch used for?`, [`Working on changes without affecting the main code`, `Deleting a repository`, `Only for backups`, `Uploading images`], 0],
  ['Resolving merge conflicts', `When does a merge conflict happen?`, [`When two changes edit the same lines differently`, `Every single time you commit`, `Only when using GitHub`, `Never, Git resolves everything automatically`], 0],
  ['Writing good commit messages', `What makes a good commit message?`, [`A clear, concise summary of what changed and why`, `As many words as possible`, `No description at all`, `Random text`], 0],

  ['Common attack types', `What is phishing?`, [`Tricking people into giving up sensitive information`, `A type of computer virus only`, `A firewall setting`, `A password manager feature`], 0],
  ['Passwords and authentication', `What is one of the most effective account security habits?`, [`Using a password manager and 2FA`, `Reusing the same password everywhere`, `Sharing your password with friends`, `Never changing your password`], 0],
  ['Thinking like a defender', `What does the principle of least privilege mean?`, [`Giving people only the access they need`, `Giving everyone full access`, `Removing all passwords`, `Disabling all security features`], 0],
  ['Securing your home network', `What is a simple way to secure your home router?`, [`Change the default admin password`, `Leave all default settings unchanged`, `Disable Wi-Fi entirely`, `Share your Wi-Fi password publicly`], 0],
  ['Recognising social engineering', `Social engineering attacks primarily target what?`, [`Human trust and psychology`, `Only computer hardware`, `Only Wi-Fi routers`, `Only mobile phones`], 0],

  ['Organising data in rows and columns', `What should each spreadsheet column contain?`, [`One consistent type of information`, `A mix of different data types`, `Only numbers`, `Nothing important`], 0],
  ['Formulas and functions', `What is a benefit of spreadsheet formulas?`, [`They update automatically when data changes`, `They only work once`, `They must be rewritten every time`, `They cannot reference more than one cell`], 0],
  ['Telling a story with charts', `What should a good chart do?`, [`Make one comparison or trend obvious at a glance`, `Show every number in tiny text`, `Always be a pie chart`, `Hide the data's meaning`], 0],
  ['Sorting and filtering data', `What does filtering do to data?`, [`Temporarily hides rows that do not match a condition`, `Permanently deletes data`, `Changes the values in cells`, `Combines multiple spreadsheets`], 0],
  ['Introduction to pivot tables', `What does a pivot table do?`, [`Summarises and groups large datasets automatically`, `Deletes duplicate rows`, `Only sorts text alphabetically`, `Creates images`], 0],

  ['What is a database?', `What do relational databases organise data into?`, [`Tables made of rows and columns`, `A single large text file`, `Only images`, `Randomly unordered lists`], 0],
  ['Writing your first SELECT query', `Which SQL keyword retrieves data from a table?`, [`SELECT`, `DELETE`, `REMOVE`, `FETCHALL`], 0],
  ['Filtering and sorting results', `Which clause lets you filter which rows are returned?`, [`WHERE`, `ORDER BY`, `LIMIT`, `JOIN`], 0],
  ['Joining multiple tables', `What does a JOIN do?`, [`Combines rows from two or more related tables`, `Deletes a table`, `Creates a new database`, `Encrypts data`], 0],
  ['Inserting and updating data', `What could happen if you run UPDATE without a WHERE clause?`, [`It changes every row in the table`, `Nothing happens at all`, `It only updates one random row`, `It deletes the table`], 0],

  ['Building a tech CV', `What makes a tech CV more convincing to employers?`, [`Concrete, demonstrable projects and skills`, `Vague claims like being hard-working`, `As many pages as possible`, `No mention of any skills`], 0],
  ['Creating a GitHub portfolio', `Why is a public GitHub profile valuable to job seekers?`, [`It gives employers concrete evidence of real skills`, `It replaces the need for any CV`, `It is only useful for designers`, `It has no effect on hiring`], 0],
  ['Acing a technical interview', `What do interviewers often value highly?`, [`Talking through your thought process, even when stuck`, `Staying completely silent while solving a problem`, `Refusing to answer questions you are unsure of`, `Memorising answers without understanding them`], 0],
  ['Networking in the tech industry', `How are many entry-level tech opportunities found?`, [`Through networking and community engagement`, `Only through cold job applications`, `Only through newspaper adverts`, `By avoiding all online communities`], 0],
  ['Finding entry-level opportunities in South Africa', `What is one pathway into tech aimed at people without a university background?`, [`Learnerships and bootcamps`, `Only postgraduate degrees`, `Only unpaid internships abroad`, `None exist in South Africa`], 0],
];

quizzes.forEach(([title, question, options, correctIndex]) => {
  setQuizIfMissing(title, question, options, correctIndex);
});

console.log(`Quiz setup complete: checked ${quizzes.length} lessons.`);

module.exports = {};
