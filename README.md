# Trackly

**Live app: https://trackly-rust.vercel.app**

**Trackly is a personal learning organizer and progress tracker.** People learn from anywhere (YouTube, documentation, books, college).
Trackly does not host that content. It helps you organize it into courses, mark lessons done, set goals, log progress and see everything on a dashboard.

## Features

**For every user**
- Register, log in and log out (JWT). **Forgot password:** a single-use reset link, valid for 60 minutes, is sent by email. Passwords are hashed with bcrypt and never stored in plain text.
- **Courses:** browse, search, filter by category and level, and open a course made of modules and lessons (each lesson is a link to the learning resource).
- **Enrollment:** enroll, mark lessons complete (with undo), see progress per course in *My Courses*.
- **Track Your Goals:** three goal kinds, with nested sub-goals.
  - *Milestones* (tick things off), *Habits* (daily or weekly target with streaks) and *Targets* (count toward a number).
  - Log progress, edit or undo it, see a 7-day habit history, a 12-week activity grid and celebration moments when you reach something real.
- **Dashboard:** greeting, totals, continue-learning, goals "Today" panel.
- **Notifications bell:** new courses, deadline reminders, a daily thought (computed from real data).
- **Profile:** edit name, change password, delete account.
- Light and dark themes with an animated switch, responsive layout and accessible controls.

**For admins** (role enforced on the server)
- The notification bell also shows **new users** who registered in the last 14 days (names only, worked out from the account creation date; nothing extra is stored).
- Overview numbers, a read-only **Users** list (search by name or email), course list with search and status filter.
- Create, edit, publish or unpublish, archive, restore and permanently delete courses (modules and lessons editor with reordering).

Trackly is **not** a marketplace, video platform, social network or payment platform.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 19, Vite, React Router 7, plain CSS with design tokens |
| Backend | Node.js, Express 5, REST API |
| Database | MongoDB Atlas with Mongoose 9 |
| Auth and security | JWT (HS256), bcryptjs, helmet, CORS allow-list, rate limiting, input validation |
| Tests | `node:test` and supertest (no database needed) |

## Project structure

```
.
├── client/                 React app (Vite)
│   ├── src/
│   │   ├── components/     layout, auth, goals and shared components
│   │   ├── pages/          jsx_files/ (pages) and css_files/ (page styles)
│   │   ├── context/        auth and toast providers
│   │   ├── lib/            API helper, hooks, pure helpers (goal progress, dates)
│   │   └── config/         API base URL
│   ├── tests/
│   └── vercel.json         send every route to index.html so refreshing a deep link works
├── server/                 Express API
│   ├── config/             database connection
│   ├── controllers/        request handlers
│   ├── middleware/         auth and admin checks
│   ├── models/             User, Course, Enrollment, Goal, GoalEntry
│   ├── routes/             /api/auth, users, courses, enrollments, goals, notifications, admin
│   ├── utils/              progress and safe-user helpers
│   ├── scripts/            setRole.js (make an admin), seedShowcaseCourses.js (starter courses), dbStats.js (storage check), dataCheck.js (read-only data check)
│   └── tests/
└── README.md
```

## Run it locally

Requirements: Node.js 20+ and a MongoDB Atlas (or local MongoDB) connection string.

```bash
# 1. Backend
cd server
cp .env.example .env        # then fill in MONGO_URI and JWT_SECRET
npm install
npm run dev                 # http://localhost:5000  (health check: /api/health)
```

```bash
# 2. Frontend (in another terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

### Environment variables

Real values go only in `.env` files, which are git-ignored. Never commit them.

| File | Variable | Required | Meaning |
|---|---|---|---|
| `server/.env` | `MONGO_URI` | yes | MongoDB connection string |
| `server/.env` | `JWT_SECRET` | yes | long random string used to sign login tokens |
| `server/.env` | `PORT` | no | API port (default 5000) |
| `server/.env` | `BREVO_API_KEY`, `MAIL_FROM` | no | for password-reset emails: a Brevo API key (a secret, set only on the host) and a sender address verified in Brevo. Without them the reset email is not sent. |
| `server/.env` | `APP_URL` | no | website address used in the reset link (defaults to the first `CLIENT_ORIGIN`) |
| `server/.env` | `CLIENT_ORIGIN` | no | allowed browser origin(s), comma separated, no trailing slash (default `http://localhost:5173`); set to the live frontend URL in production |
| `client/.env` | `VITE_API_URL` | no | API base URL including `/api` (default `http://localhost:5000/api`) |

### Create the first admin

Register normally in the app, then run this once on the machine that has the server `.env`:

```bash
cd server
node scripts/setRole.js <email> admin
```

### Add starter courses (optional)

Twelve real courses (HTML/CSS, JavaScript, TypeScript, React, Node/Express, Python, SQL, MongoDB/Mongoose, Git/GitHub, computer science basics, security and accessibility) made of free videos and official documentation are included. As an admin, preview and then add them:

```bash
cd server
node scripts/seedShowcaseCourses.js <admin-email>           # dry run, writes nothing
node scripts/seedShowcaseCourses.js <admin-email> --apply   # adds them (existing titles are skipped)
```

### Tests, lint and build

```bash
cd server && npm test            # API tests (no database required)
cd client && npm test            # helper tests
cd client && npm run lint && npm run build
```

## API overview

All routes are under `/api`. Routes marked 🔒 need a login token, 🛡 need the admin role.

| Area | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`, 🔒 `GET /auth/me` |
| Users | 🔒 `PATCH /users/me`, `PATCH /users/me/password`, `DELETE /users/me` |
| Courses | `GET /courses` (search, category, level, page), `GET /courses/:id`; 🛡 `POST /courses`, `PUT /courses/:id`, `DELETE /courses/:id` (archive) |
| Enrollments | 🔒 `GET /enrollments/me`, `POST /enrollments/:courseId`, `DELETE /enrollments/:id`, `POST /enrollments/:id/lessons/:lessonId/complete` |
| Goals | 🔒 `GET/POST /goals`, `GET/PATCH/DELETE /goals/:id`, `POST /goals/:id/subgoals`, `POST /goals/:id/entries`, `PATCH/DELETE /goals/:id/entries/:entryId` |
| Notifications | 🔒 `GET /notifications`, `POST /notifications/seen` |
| Admin | 🛡 `GET /admin/stats`, `GET /admin/users` (search, page), `GET /admin/courses`, `GET /admin/courses/:id`, `PATCH /admin/courses/:id/restore`, `DELETE /admin/courses/:id/purge` |

Responses are JSON: `{ success: true, ... }` on success and `{ success: false, message }` on failure, with matching HTTP status codes
(400 invalid input, 401 not signed in, 403 not allowed, 404 not found, 409 conflict, 429 too many attempts).

## Security notes

- Passwords are hashed (bcrypt); login tokens carry a version so a password change signs out other devices.
- Every private resource is filtered by the signed-in user; admin power is checked on the server, not only hidden in the UI.
- Inputs are validated and whitelisted on the server; lesson and thumbnail links must be `http(s)`.
- `helmet`, a CORS allow-list, a request size limit and rate limits on sign-in and sensitive actions are enabled.
- Password reset: only a hash of the emailed token is stored, it expires after 60 minutes and works once, the reply never reveals whether an email is registered, and every device is signed out after a reset.
- Secrets live only in git-ignored `.env` files.
- Dependency audit: 0 vulnerabilities across client and server (`npm audit` clean, `chokidar` overridden to `^4.0.1` in server `overrides`).

## Deployment

| | URL |
|---|---|
| Live app (frontend) | https://trackly-rust.vercel.app |
| API (backend) | https://trackly-api-v840.onrender.com |
| API health check | https://trackly-api-v840.onrender.com/api/health |

### How it is deployed

- **Frontend:** [Vercel](https://vercel.com), project root `client`, Vite preset. `client/vercel.json` sends every route to `index.html` so refreshing pages such as `/goals` works. Environment variable: `VITE_API_URL` = `<backend-url>/api`.
- **Backend:** [Render](https://render.com) Web Service, root `server`, build `npm install`, start `npm start`. Environment variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (the Vercel URL, no trailing slash) and `NODE_ENV=production`. The server listens on the `PORT` the host provides and trusts one proxy hop so rate limiting works.
- **Database:** MongoDB Atlas, with Network Access allowing the host's outgoing addresses.
- The free Render plan sleeps after inactivity, so the first request after a pause can take about a minute.

