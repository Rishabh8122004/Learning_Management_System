# Trackly web app (client)

React 19 + Vite + React Router 7. See the [root README](../README.md) for the full project overview.

## Setup

```bash
npm install
npm run dev        # http://localhost:5173 (expects the API on http://localhost:5000)
npm run lint
npm run build
npm test           # helper tests (goal progress, achievements, dates)
```

Optional `.env` (copy `.env.example`): `VITE_API_URL` is the API base URL including `/api`. Never put secrets in `VITE_` variables.

## Structure

| Folder | Purpose |
|---|---|
| `src/pages/jsx_files`, `src/pages/css_files` | one file per screen and its styles |
| `src/components` | `layout/` (navbar, footer, route guards), `auth/`, `goals/`, `admin/` (parts of the course editor), shared pieces such as `ConfirmInline` |
| `src/context` | `AuthContext` (session) and the toast provider |
| `src/services` | `apiRequest`, the one function that talks to the API |
| `src/hooks` | `useGoals`, `useCountUp`, `useReveal`, `useFlip`, `useMediaQuery`, `useAutoFocus` |
| `src/lib` | pure helpers: goal progress and celebrations, course form, validators, dates, page titles |
| `src/index.css`, `src/polish.css` | design tokens (colours, spacing, motion) and shared polish |

## Conventions

- Every API-backed section shows a loading state, an error state with a retry, and an empty state.
- Colours, spacing, radii and motion come from the tokens in `index.css`; light and dark themes share them.
- Animations respect the system "reduce motion" setting.
- Nothing shown is invented: numbers, streaks and achievements come from saved data.
