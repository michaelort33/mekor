# Mekor Mirror

Deterministic Next.js rebuild of [mekorhabracha.org](https://www.mekorhabracha.org) with route/status parity, extracted content manifests, and Blob-backed public assets.

## Stack

- Next.js 16 App Router + TypeScript
- Mirror data pipeline with Playwright + tsx scripts
- Vercel Blob for public asset storage
- Postgres (Neon-compatible) + Drizzle for form submissions
- Resend for form notification emails

## Local Setup

1. Copy environment values:

```bash
cp .env.example .env.local
```

2. Fill required values in `.env.local`:

- `BLOB_READ_WRITE_TOKEN`
- `DATABASE_URL`
- `RESEND_API_KEY`
- `FORM_NOTIFY_EMAIL_FROM`
- `FORM_NOTIFY_EMAIL_TO`

3. Generate/apply DB schema:

```bash
npm run db:generate
npm run db:push
```

4. Run the app:

```bash
npm run dev
```

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
