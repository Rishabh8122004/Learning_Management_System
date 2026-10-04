// Real starter courses for the Trackly catalog. Every lesson is a link to free, public learning material
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
