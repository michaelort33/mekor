# Agents

## Cursor Cloud specific instructions

Single Next.js 16 app (not a monorepo). Node 22, npm package manager.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `npm ci` |
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Test | `npm run test` |
| Build | `npm run build` |
| DB push | `DATABASE_URL=<url> npx drizzle-kit push` |

### Database

The app requires PostgreSQL. A local instance works fine (`sudo pg_ctlcluster <ver> main start`). Create a database and user, then set `DATABASE_URL` in `.env.local`. The Drizzle config (`drizzle.config.ts`) loads env vars from `.env` via `dotenv/config` — if you only have `.env.local`, pass `DATABASE_URL` as an env var prefix to `drizzle-kit` commands.

After DB is running, apply schema with: `DATABASE_URL=... npx drizzle-kit push`

### Tests

Tests use the Node.js native test runner via `tsx --test`. They do **not** require a database — they read from pre-built JSON files in `mirror-data/`. All 15 tests should pass out of the box after `npm ci`.

### Optional services

- `RESEND_API_KEY` — only needed for form email delivery (forms still save to DB without it).
- `BLOB_READ_WRITE_TOKEN` — only needed for Vercel Blob asset display (pages render without it).
- Mirror pipeline (`npm run mirror:*`) — not needed for development; `mirror-data/` already contains pre-built content.
