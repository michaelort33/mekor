# Mekor Mirror

Deterministic Next.js rebuild of [mekorhabracha.org](https://www.mekorhabracha.org) with route/status parity, extracted content manifests, and Blob-backed public assets.

## Stack

- Next.js 16 App Router + TypeScript
- Mirror data pipeline with Playwright + tsx scripts
- Vercel Blob for public asset storage
- Postgres (Neon-compatible) + Drizzle for form submissions
- SendGrid for transactional and notification emails

## Site feedback widget

Public pages include a floating **Share an idea** launcher (bottom-right). It opens a chat-style sheet where an agentic AI collects suggestions and feedback only — it does not answer questions or use a knowledge base. Structured submissions are stored in `site_suggestions` (with optional session transcripts) and reviewed at `/admin/feedback`.

- Requires AI Gateway auth or `OPENAI_API_KEY` for the chat path (`FEEDBACK_CHAT_MODEL` optional).
- When AI is unavailable, visitors can still submit via the short fallback form to the same table.
- Apply the schema with `npm run db:generate` / `npm run db:push` (migration `0029_site_suggestions_feedback`).

## Local Setup

1. Copy environment values:

```bash
cp .env.example .env.local
```

2. Fill required values in `.env.local`:

- `BLOB_READ_WRITE_TOKEN`
- `DATABASE_URL`
- `USER_SESSION_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_PASSWORD` (or `ADMIN_SESSION_SECRET`)
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `FORM_NOTIFY_EMAIL_FROM`
- `FORM_NOTIFY_EMAIL_TO`
- `STRIPE_RESTRICTED_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FEATURE_DUES=true`
- `FEATURE_EVENT_SIGNUPS=true`
- `FEATURE_PUBLIC_DIRECTORY=true`

3. Generate/apply DB schema:

```bash
npm run db:generate
npm run db:push
```

4. Run the app:

```bash
npm run dev
```

For local admin UI work, set `LOCAL_ADMIN_AUTOLOGIN_EMAIL` to an existing admin or super-admin account. In development, requests to `localhost`, `127.0.0.1`, or `::1` will create the normal user session and return to the requested admin page. The option is disabled in production and on non-loopback hosts, and still requires `USER_SESSION_SECRET`.

## Mirror Data Pipeline

Run the full extraction/validation pipeline:

```bash
npm run mirror:all
```

Individual steps are available via:

- `npm run mirror:discover`
- `npm run mirror:snapshot`
- `npm run mirror:extract-assets`
- `npm run mirror:build-content`
- `npm run mirror:build-search`
- `npm run mirror:verify`
- `npm run native:verify`
- `npm run mirror:blob-sync`
- `npm run mirror:render-mode-report`

Generated structured outputs live under `mirror-data/` (`mirror-data/raw/` stays ignored).

## Route Render Mode Control

Render mode is configured per route in `lib/routing/render-mode.ts`.

- `native`: serve the native page implementation.
- `mirror`: serve the mirrored document renderer.
- Default for unmapped routes: `mirror`.

Global rollback kill switch:

- Set `FORCE_MIRROR_ALL=true` to force every route into mirror mode.
- Set `FORCE_MIRROR_ALL=false` (or unset) to use per-route modes.

### Safe Enable/Disable Runbook

1. Open `lib/routing/render-mode.ts`.
2. Toggle the route path mode:
   - Enable native: set `"/your-route": "native"`.
   - Roll back route: set `"/your-route": "mirror"`.
3. Run diagnostics:
   - `npm run mirror:render-mode-report`
4. Verify behavior:
   - Route appears under `native-enabled routes` when native.
   - Route disappears from `native-enabled routes` after rollback.
5. Emergency global rollback:
   - Set `FORCE_MIRROR_ALL=true` and redeploy/restart.

## Visual Parity Gate

Native route enablement is guarded by screenshot parity checks across mobile/tablet/desktop breakpoints.

- Mirror baseline and approval records are tracked in `visual-parity/`
- Candidate and report artifacts are generated under `output/visual-parity/`
- Threshold breach (`>2%`) fails CI

See `docs/visual-parity.md` for commands, report interpretation, and baseline refresh workflow.

Native route contract matrix: [`docs/native-data-contract-matrix.md`](docs/native-data-contract-matrix.md)

## Native Rollout Governance

Route-by-route native rollout tracking artifacts:

- Tracker source: `mirror-data/rollout/route-rollout-tracker.json`
- Tracker report: `docs/mirror-rollout/rollout-tracker.md`
- Retirement checklist: `docs/mirror-rollout/mirror-retirement-checklist.md`
- Completion report: `docs/mirror-rollout/mirror-retirement-completion-report.md`

Generate/update rollout reports and retirement audit:

```bash
npm run mirror:rollout-audit
```
