# Trackly API (server)

Express 5 + Mongoose 9 REST API for Trackly. See the [root README](../README.md) for the full project overview and API table.

## Setup

```bash
cp .env.example .env     # fill in MONGO_URI and JWT_SECRET (never commit .env)
npm install
npm run dev              # nodemon, http://localhost:5000
npm start                # plain node, for production
npm test                 # node:test + supertest, no database needed
```

Health check: `GET /api/health`.

## Environment variables

| Variable | Required | Meaning |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | secret for signing tokens |
| `PORT` | no | default 5000 |
| `CLIENT_ORIGIN` | no | allowed CORS origin(s), comma separated, default `http://localhost:5173` |

## Structure

| Folder | Purpose |
|---|---|
| `config/` | database connection |
| `routes/` | URL → controller wiring (`auth`, `users`, `courses`, `enrollments`, `goals`, `notifications`, `admin`) |
| `controllers/` | request handling and validation |
| `middleware/` | `authMiddleware` (token + database check), `adminMiddleware` |
| `models/` | `User`, `Course` (modules, lessons), `Enrollment`, `Goal`, `GoalEntry` |
| `utils/` | progress calculation, safe user shape, daily message |
| `scripts/` | `setRole.js <email> <role>` (make someone admin), `dbStats.js` (read-only storage report) |
| `tests/` | route and logic tests with stubbed models |

## If the database does not connect

The server no longer stops when MongoDB cannot be reached. It retries (waiting 2 s, 4 s ... up to 30 s) for about 10 minutes and prints a hint.
The usual cause is that your current internet address is not in **MongoDB Atlas > Network Access**: add it (or allow `0.0.0.0/0`, which deployment needs anyway) and the server connects by itself, no restart needed.

## Rules the code follows

- Private data is always scoped to `req.user.id`; admin routes use `adminMiddleware`.
- Lessons are links only. No files or media are stored in the database.
- Errors use the shape `{ success: false, message }` with correct status codes.
- Before deploying: set `CLIENT_ORIGIN` to the live frontend URL and enable `trust proxy` if the host sits behind a proxy.
