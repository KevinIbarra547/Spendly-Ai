# Spendly

A personal finance app for students — track expenses, set goals, get AI coaching, and scan receipts.

## Run & Operate

- `cd artifacts/spendly && node server.js` — run the Spendly server (port 3000)
- Required env secret: `SESSION_SECRET` — server will refuse to boot without it
- Optional env secret: `GROQ_API_KEY` — needed for AI coach features (CP later)

## Stack

- Plain JavaScript (no TypeScript) — CommonJS (`require`)
- Node.js + Express 4
- express-session for auth sessions
- bcryptjs for password hashing (CP02+)
- multer for file uploads (profile pics, receipts)
- groq-sdk for AI coach (later checkpoint)
- Tailwind v4 via browser CDN in HTML pages

## Where things live

- `artifacts/spendly/server.js` — entry point, session config, route mounts
- `artifacts/spendly/routes/` — placeholder routers (auth, expenses, admin, ai)
- `artifacts/spendly/middleware/auth.js` — requireAuth / requireAdmin stubs
- `artifacts/spendly/public/` — static HTML pages + CSS + JS stubs
- `artifacts/spendly/data/` — JSON flat-file storage (users, expenses, goals, site_config)

## Architecture decisions

- Flat-file JSON storage for simplicity in early checkpoints; no database until later CPs
- `SESSION_SECRET` required at boot — server exits immediately if missing
- `SERVER_START_ISO` recorded at startup and exposed via `/api/health` for the dev banner boot time
- `/api/site/config` is a public GET (no auth) — frontend hits it on every page load
- Dev banner in top-right of every HTML page verifies Tailwind v4 load, backend health, and API ping

## Product

9 pages: Landing, Dashboard, Expense Log, Goals & Wishlist, AI Coach, Analytics, Profile, Admin, Checkpoints. All placeholder UIs for CP01 — built out in later checkpoints.

## User preferences

- Plain JavaScript only — no TypeScript anywhere in this project
- CommonJS (`require`, `module.exports`) — not ES modules

## Gotchas

- `SESSION_SECRET` must be set in Replit Secrets before `node server.js` will start
- `GROQ_API_KEY` is optional for boot but needed for AI features
- Dev banner must be removed from all HTML files before the final demo
- Do NOT init git / commit / push — the team handles git themselves

## Pointers

- See the `pnpm-workspace` skill for workspace structure details
