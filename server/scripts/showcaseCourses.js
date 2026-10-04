// Real starter courses for the Trackly catalog (twelve in total). Every lesson is a link to free, public learning material
// (official documentation or a freeCodeCamp / well-known YouTube course). Durations are in minutes;
// for videos they are the real video length rounded to the minute, for docs pages an honest estimate.
// Used by seedShowcaseCourses.js. Nothing here is stored until an admin runs that script with --apply.

const MDN = 'https://developer.mozilla.org/en-US/docs/';

const lesson = (title, content, duration, description = '') => ({ title, content, duration, description });

const courses = [
  {
    title: 'JavaScript Essentials',
    description:
      'Learn the language of the web from the ground up: values, functions, objects and arrays. A full beginner video course from freeCodeCamp is paired with the official MDN guide so you can watch, then read and practise.',
    category: 'Programming',
    level: 'beginner',
    tags: ['javascript', 'beginner', 'mdn', 'freecodecamp'],
    modules: [
      {
        title: 'Getting started',
        description: 'Watch one complete beginner course, then meet the reference you will keep using.',
        lessons: [
          lesson('Learn JavaScript - Full Course for Beginners (freeCodeCamp)', 'https://www.youtube.com/watch?v=PkZNo7MFNFg', 207, 'A complete beginner course on YouTube.'),
          lesson('The JavaScript Guide (MDN)', `${MDN}Web/JavaScript/Guide`, 30, 'The official guide: read the introduction and grammar chapters.'),
        ],
      },
      {
        title: 'Core building blocks',
        description: 'Functions, objects and arrays: the three things every program is made of.',
        lessons: [
          lesson('Functions', `${MDN}Web/JavaScript/Guide/Functions`, 25),
          lesson('Working with objects', `${MDN}Web/JavaScript/Guide/Working_with_objects`, 25),
          lesson('Arrays', `${MDN}Learn_web_development/Core/Scripting/Arrays`, 20),
        ],
      },
    ],
  },
  {
    title: 'React Fundamentals',
    description:
      'Build user interfaces with React: components, state and effects. Start with a one-hour video, follow the official react.dev tutorial pages, and finish with a longer project-style course when you want more practice.',
    category: 'Web Development',
    level: 'beginner',
    tags: ['react', 'frontend', 'hooks', 'javascript'],
    modules: [
      {
        title: 'First steps',
        description: 'See what React is and how to think about a screen as components.',
        lessons: [
          lesson('React Fundamentals - Full Course for Beginners (freeCodeCamp)', 'https://www.youtube.com/watch?v=6Ied4aZxUzc', 64, 'A one-hour introduction on YouTube.'),
          lesson('Quick Start (react.dev)', 'https://react.dev/learn', 40),
          lesson('Thinking in React', 'https://react.dev/learn/thinking-in-react', 30, 'Turn a design into components step by step.'),
        ],
      },
      {
        title: 'State and effects',
        description: 'How components remember things and talk to the outside world.',
        lessons: [
          lesson('State: a component’s memory', 'https://react.dev/learn/state-a-components-memory', 25),
          lesson('Synchronizing with Effects', 'https://react.dev/learn/synchronizing-with-effects', 30),
          lesson('Built-in React Hooks (reference)', 'https://react.dev/reference/react/hooks', 20, 'Skim the list so you know what exists.'),
        ],
      },
      {
        title: 'Go deeper',
        description: 'A longer course for more practice.',
        lessons: [
          lesson('React Full Course (Bro Code)', 'https://www.youtube.com/watch?v=CgkZ7MvWUAA', 283, 'About five hours of hands-on React.'),
        ],
      },
    ],
  },
  {
    title: 'Node.js and Express APIs',
    description:
      'Build a REST API with Node.js and Express and understand how the web talks to a server: HTTP, status codes, CORS and tokens. Mixes a full freeCodeCamp video course with the official Node and Express documentation.',
    category: 'Backend',
    level: 'intermediate',
    tags: ['nodejs', 'express', 'api', 'http', 'jwt'],
    modules: [
      {
        title: 'Node.js basics',
        description: 'What Node is and a long video course to build with.',
        lessons: [
          lesson('Introduction to Node.js', 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs', 15),
          lesson('Node.js and Express.js - Full Course (freeCodeCamp)', 'https://www.youtube.com/watch?v=Oe421EPjeBE', 497, 'A very long course: watch it in parts.'),
        ],
      },
      {
        title: 'Express in practice',
        description: 'The four ideas behind every Express app.',
        lessons: [
          lesson('Hello world', 'https://expressjs.com/en/starter/hello-world.html', 10),
          lesson('Routing', 'https://expressjs.com/en/guide/routing.html', 20),
          lesson('Using middleware', 'https://expressjs.com/en/guide/using-middleware.html', 20),
          lesson('Error handling', 'https://expressjs.com/en/guide/error-handling.html', 15),
        ],
      },
      {
        title: 'How the web talks to your API',
        description: 'The rules every API has to follow.',
        lessons: [
          lesson('An overview of HTTP (MDN)', `${MDN}Web/HTTP/Overview`, 20),
          lesson('HTTP response status codes (MDN)', `${MDN}Web/HTTP/Status`, 15),
          lesson('Cross-Origin Resource Sharing (CORS) (MDN)', `${MDN}Web/HTTP/CORS`, 20),
          lesson('Introduction to JSON Web Tokens', 'https://jwt.io/introduction', 20),
        ],
      },
    ],
  },
  {
    title: 'MongoDB and Mongoose',
    description:
      'Store and query real data: documents and collections in MongoDB, then models and schemas with Mongoose. A long video course plus the official docs for the parts you will use in every project.',
    category: 'Databases',
    level: 'intermediate',
    tags: ['mongodb', 'mongoose', 'database', 'nodejs'],
    modules: [
      {
        title: 'MongoDB',
        description: 'Documents, collections and the four basic operations.',
        lessons: [
          lesson('MongoDB Tutorial for Beginners (ProgrammingKnowledge)', 'https://www.youtube.com/watch?v=d2MnfyV20hk', 385, 'About six hours: watch the parts you need.'),
          lesson('CRUD operations (MongoDB manual)', 'https://www.mongodb.com/docs/manual/crud/', 30),
        ],
      },
      {
        title: 'Mongoose',
        description: 'Describe your data with schemas and use it from Node.',
        lessons: [
          lesson('Schemas (Mongoose guide)', 'https://mongoosejs.com/docs/guide.html', 30),
          lesson('Models (Mongoose)', 'https://mongoosejs.com/docs/models.html', 20),
        ],
      },
    ],
  },
  {
    title: 'Git and GitHub Essentials',
    description:
      'Track your work, undo mistakes and collaborate: commits, branches and pull requests. Two short crash courses on YouTube plus the free Pro Git book and the GitHub documentation.',
    category: 'Tools',
    level: 'beginner',
    tags: ['git', 'github', 'version-control', 'tools'],
    modules: [
      {
        title: 'Crash courses',
        description: 'Two short videos that cover the daily commands.',
        lessons: [
          lesson('Git and GitHub for Beginners - Crash Course (freeCodeCamp)', 'https://www.youtube.com/watch?v=RGOj5yH7evk', 69),
          lesson('Git & GitHub Crash Course For Beginners (Traversy Media)', 'https://www.youtube.com/watch?v=SWYqp7iY_Tc', 33),
        ],
      },
      {
        title: 'Understand it properly',
        description: 'Short readings that explain why Git works the way it does.',
        lessons: [
          lesson('What is Git? (Pro Git book)', 'https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F', 20),
          lesson('Branches in a nutshell (Pro Git book)', 'https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell', 20),
          lesson('About pull requests (GitHub Docs)', 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests', 20),
        ],
      },
    ],
  },
  {
    title: 'HTML and CSS Foundations',
    description:
      'Learn how every web page is built: structure with HTML, style with CSS, and layouts that work on any screen using Flexbox, Grid and media queries. Two freeCodeCamp video courses plus the MDN reference pages you will keep opening.',
    category: 'Web Development',
    level: 'beginner',
    tags: ['html', 'css', 'flexbox', 'responsive'],
    modules: [
      {
        title: 'HTML',
        description: 'The structure of a page.',
        lessons: [
          lesson('HTML Full Course - Build a Website Tutorial (freeCodeCamp)', 'https://www.youtube.com/watch?v=pQN-pnXPaVg', 123),
          lesson('Structuring content with HTML (MDN)', `${MDN}Learn_web_development/Core/Structuring_content`, 40),
        ],
      },
      {
        title: 'CSS and layout',
        description: 'Style, then arrange things so they work on phones and desktops.',
        lessons: [
          lesson('CSS Full Course - Includes Flexbox and CSS Grid (freeCodeCamp)', 'https://www.youtube.com/watch?v=ieTHC78giGQ', 86),
          lesson('CSS styling basics (MDN)', `${MDN}Learn_web_development/Core/Styling_basics`, 40),
          lesson('Basic concepts of flexbox (MDN)', `${MDN}Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox`, 25),
          lesson('Basic concepts of grid layout (MDN)', `${MDN}Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout`, 25),
          lesson('Using media queries (MDN)', `${MDN}Web/CSS/CSS_media_queries/Using_media_queries`, 20, 'This is how a layout adapts to small screens.'),
        ],
      },
    ],
  },
  {
    title: 'Python for Beginners',
    description:
      'Start programming with Python, one of the most widely used languages for scripting, data and automation. A complete freeCodeCamp video course alongside the official Python tutorial.',
    category: 'Programming',
    level: 'beginner',
    tags: ['python', 'beginner', 'scripting'],
    modules: [
      {
        title: 'Learn the basics',
        description: 'Watch the full course, then read the official tutorial for the same ideas.',
        lessons: [
          lesson('Learn Python - Full Course for Beginners (freeCodeCamp)', 'https://www.youtube.com/watch?v=rfscVS0vtbw', 267),
          lesson('An informal introduction to Python (python.org)', 'https://docs.python.org/3/tutorial/introduction.html', 25),
          lesson('More control flow tools (python.org)', 'https://docs.python.org/3/tutorial/controlflow.html', 30),
          lesson('The Python Tutorial (full index)', 'https://docs.python.org/3/tutorial/index.html', 20, 'Keep this as your reference for later chapters.'),
        ],
      },
    ],
  },
  {
    title: 'SQL and Relational Databases',
    description:
      'Understand tables, rows and relationships, and learn to ask questions with SQL queries. A full database course on video plus SQLBolt, a free set of interactive lessons you practise in the browser.',
    category: 'Databases',
    level: 'beginner',
    tags: ['sql', 'database', 'queries', 'joins'],
    modules: [
      {
        title: 'Database fundamentals',
        description: 'A complete beginner course.',
        lessons: [
          lesson('SQL Tutorial - Full Database Course for Beginners (freeCodeCamp)', 'https://www.youtube.com/watch?v=HXV3zeQKqGY', 261),
        ],
      },
      {
        title: 'Practise in the browser',
        description: 'Short interactive exercises on SQLBolt.',
        lessons: [
          lesson('SQLBolt: SELECT queries 101', 'https://sqlbolt.com/lesson/select_queries_introduction', 20),
          lesson('SQLBolt: Multi-table queries with JOINs', 'https://sqlbolt.com/lesson/select_queries_with_joins', 25),
          lesson('SQLBolt: all lessons', 'https://sqlbolt.com/', 90, 'Work through the rest at your own pace.'),
        ],
      },
    ],
  },
  {
    title: 'TypeScript Essentials',
    description:
      'Add types to JavaScript so many mistakes are caught before your code even runs. Used by most modern React and Node projects. A freeCodeCamp video tutorial plus the official TypeScript handbook.',
    category: 'Programming',
    level: 'intermediate',
    tags: ['typescript', 'javascript', 'types'],
    modules: [
      {
        title: 'Get started',
        description: 'See why types help and how to write them.',
        lessons: [
          lesson('Learn TypeScript - Full Tutorial (freeCodeCamp)', 'https://www.youtube.com/watch?v=30LWjhZzg50', 286),
          lesson('The TypeScript Handbook: introduction', 'https://www.typescriptlang.org/docs/handbook/intro.html', 15),
          lesson('Everyday Types (TypeScript Handbook)', 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html', 30),
        ],
      },
    ],
  },
  {
    title: 'React in Practice',
    description:
      'Go beyond the basics: build a small game, share state between components, write your own hooks and move between pages with React Router. Best taken after React Fundamentals.',
    category: 'Web Development',
    level: 'intermediate',
    tags: ['react', 'hooks', 'state', 'react-router'],
    modules: [
      {
        title: 'Build something',
        description: 'Learn by making a working app.',
        lessons: [
          lesson('Tutorial: Tic-Tac-Toe (react.dev)', 'https://react.dev/learn/tutorial-tic-tac-toe', 60, 'A hands-on tutorial that you code along with.'),
        ],
      },
      {
        title: 'State and hooks',
        description: 'The patterns used in real applications.',
        lessons: [
          lesson('Managing State (react.dev)', 'https://react.dev/learn/managing-state', 30),
          lesson('Sharing state between components', 'https://react.dev/learn/sharing-state-between-components', 20),
          lesson('Reusing logic with custom Hooks', 'https://react.dev/learn/reusing-logic-with-custom-hooks', 25),
        ],
      },
      {
        title: 'Multiple pages',
        description: 'Routing is what turns one screen into a whole app.',
        lessons: [
          lesson('React Router documentation', 'https://reactrouter.com/home', 30),
        ],
      },
    ],
  },
  {
    title: 'Computer Science Foundations',
    description:
      'The ideas behind all programming: how computers think, algorithms and data structures. Harvard CS50 is one of the most popular free introductions in the world; it is paired with two freeCodeCamp courses.',
    category: 'Computer Science',
    level: 'beginner',
    tags: ['cs50', 'algorithms', 'data-structures', 'fundamentals'],
    modules: [
      {
        title: 'Start with CS50',
        description: 'Harvard introduction to computer science.',
        lessons: [
          lesson('CS50 - Lecture 0: Scratch (Harvard)', 'https://www.youtube.com/watch?v=6px2ii_x52A', 140, 'The first lecture; the full course is linked below.'),
          lesson('CS50x - full course site', 'https://cs50.harvard.edu/x/', 30, 'Lectures, notes and problem sets, free.'),
        ],
      },
      {
        title: 'Programming and algorithms',
        description: 'Think like a programmer.',
        lessons: [
          lesson('Introduction to Programming and Computer Science (freeCodeCamp)', 'https://www.youtube.com/watch?v=zOjov-2OZ0E', 119),
          lesson('Algorithms and Data Structures Tutorial (freeCodeCamp)', 'https://www.youtube.com/watch?v=8hly31xKli0', 322),
        ],
      },
    ],
  },
  {
    title: 'Web Security and Accessibility Basics',
    description:
      'Two skills that separate hobby projects from professional ones: keeping an app safe from the most common attacks, and making it usable by everyone, including people who use screen readers or only a keyboard.',
    category: 'Web Development',
    level: 'intermediate',
    tags: ['security', 'owasp', 'accessibility', 'a11y'],
    modules: [
      {
        title: 'Security',
        description: 'The most common web risks, explained.',
        lessons: [
          lesson('OWASP Top Ten', 'https://owasp.org/www-project-top-ten/', 30, 'The industry list of the biggest web application risks.'),
          lesson('Cross-Origin Resource Sharing (CORS) (MDN)', `${MDN}Web/HTTP/CORS`, 20),
        ],
      },
      {
        title: 'Accessibility',
        description: 'Build for everyone.',
        lessons: [
          lesson('Learn Accessibility (web.dev)', 'https://web.dev/learn/accessibility', 60),
          lesson('Accessibility (MDN)', `${MDN}Learn_web_development/Core/Accessibility`, 30),
        ],
      },
    ],
  },
];

// Adds the order numbers the Course model needs (1, 2, 3 ... in the order written above).
const withOrder = (list) =>
  list.map((course) => ({
    ...course,
    modules: course.modules.map((mod, mi) => ({
      ...mod,
      order: mi + 1,
      lessons: mod.lessons.map((item, li) => ({ ...item, order: li + 1 })),
    })),
  }));

module.exports = { showcaseCourses: withOrder(courses) };
