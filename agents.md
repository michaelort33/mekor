# McCarr Project Execution Constraints

## Rendering Rule: No Mirror Pages
- Do not use mirrored HTML/content rendering for production pages.
- Rebuild/maintain these pages as native React + TypeScript (T3-style stack) components.
- For parity work, prioritize pixel-close implementation: spacing, typography, breakpoints, and component behavior should match the original as closely as possible.
- If a page currently uses mirror fallback data (`mirror-*` helpers, `DocumentView`, `forceMirror`, mirrored routes), migrate it to native implementation before final approval.

## Push Gate: Deploy Validation
- Before every `git push`, run `npm run prepush:deploy-check` from the repo root.
- Do not push if this command fails.
- This is the required local gate to verify deployability (lint, tests, Next build, and Vercel build parity).
- `native:verify` is included automatically when `DATABASE_URL` is set; otherwise it is skipped locally.

## CI And Tooling Parity
- Use Node 22 for local validation and CI. The repo source of truth is `.nvmrc`, and GitHub Actions must read that file instead of hardcoding a separate Node version.
- GitHub Actions must mirror the local `prepush:deploy-check` behavior for conditional steps. In particular, `native:verify` must only run when `DATABASE_URL` is configured in the environment or Actions secrets.
- Prefer calling real package entrypoints in `package.json` scripts (for example `node node_modules/eslint/bin/eslint.js`, `node node_modules/tsx/dist/cli.mjs`, `node node_modules/next/dist/bin/next`) instead of relying on `node_modules/.bin/*` shims, since those wrappers have been a recurring source of false build failures in this repo.
- Pin CI-only CLIs that affect deploy validation, especially the Vercel CLI used for parity checks. Do not rely on floating `npx` versions for required build gates.

## CI Secretless Build Policy
- Default GitHub Actions validation must assume no private runtime secrets are present unless the workflow explicitly injects them.
- `lint`, `test`, `next build`, and Vercel parity checks must pass in that secretless mode. Do not make the default CI build depend on `DATABASE_URL` or other private env vars.
- If a page or component needs database-backed data at request time but CI builds without DB credentials, handle that at the page boundary: either avoid static prerender for that route or return an empty/fallback state when the env var is missing.
- Keep strict env requirements inside truly DB-only paths such as APIs, admin tools, migrations, and dedicated verification jobs. Do not let those assumptions leak into the default public-site build.
- If a secret-backed verification step is required, make it a separate conditional job or a conditional step gated on the relevant secret being configured.

## Frontend Visual QA
- Before marking any homepage or major section redesign as done, run the page in a browser and visually inspect the changed section at desktop and mobile widths.
- Capture screenshots of the changed section and confirm the layout is not clipped, vertically squeezed, or missing media/content.
- If the section is not visually acceptable, iterate on layout/styles first and only report completion after re-checking screenshots.

## Redesign Safety Protocol (Required)
- Do not mark redesign work complete based on code review alone. A live browser check is mandatory.
- Validate changed sections at minimum widths: `1440px`, `1280px`, `1024px`, `768px`, and `390px`.
- For each changed section, verify all of the following before sign-off:
- Headings and body copy are fully visible (no clipping, truncation, or overlap).
- Images are visible and proportionate (no accidental collapse, extreme crop, or missing media block).
- CTAs/links remain visible and reachable without unexpected overlap.
- Card/grid layouts do not become vertically crushed when content is longer than expected.
- When section structure depends on dynamic CMS/db data, test with live-like populated content, not empty fallbacks only.
- Include before/after screenshots for the affected section in the handoff summary when layout changes are substantial.
- If visual regressions are found, continue iterating until the section is readable and balanced at all required widths.
## Instruction Chain
- Read and apply `/Users/meshulumort/Documents/AGENTS.md` before applying this workspace file.

## Cursor Cloud specific instructions

Dependencies are refreshed automatically on VM startup via the configured update script (`npm ci`). Node 22 (per `.nvmrc`) is already available. The following notes cover non-obvious runtime behavior for this repo.

### Services
- Single long-running dev process: the Next.js 16 (Turbopack) app. Start it with `npm run dev` (serves on http://localhost:3000). API routes, `proxy.ts` edge auth, and cron endpoints all live inside this one process — there are no separate workers/queues.
- Standard commands live in `package.json`: `npm run lint`, `npm run test`, `npm run build`, `npm run dev`. DB schema tooling: `npm run db:generate` / `npm run db:push` (drizzle-kit). The full push gate is `npm run prepush:deploy-check` (lint + test + `native:verify` when `DATABASE_URL` is set + Next build + Vercel build parity).

### Environment / secrets
- Injected as env vars in cloud runs: `DATABASE_URL` (Neon Postgres), `BLOB_READ_WRITE_TOKEN`, `STRIPE_*`, `CRON_SECRET`, `FORM_NOTIFY_EMAIL_*`, etc. These are picked up automatically by Next.js from `process.env`.
- Non-secret dev defaults (feature flags, `USER_SESSION_SECRET`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, native-route flags) live in a gitignored `.env.local`. If that file is missing, recreate it from `.env.example` (auth/signup fails without `USER_SESSION_SECRET`).

### Non-obvious gotchas
- `npm run test` hangs forever when `DATABASE_URL` is set: DB-backed test files leave postgres connections open, so the Node test process never exits after tests complete (it is NOT stuck on a test). Run tests with a force-exit instead, e.g. `node node_modules/tsx/dist/cli.mjs --test --test-force-exit tests/**/*.test.ts` (enable `shopt -s globstar` in bash). Secretless runs (no `DATABASE_URL`) skip DB tests and exit normally.
- `system_settings` feature flags must be seeded in the DB or `settings.test.ts` fails and DB-driven feature flags read as off. Seed idempotently with `node node_modules/tsx/dist/cli.mjs scripts/db/seed-settings.ts` (already seeded in the shared Neon DB; only re-run against a fresh database).
- `/signup` redirects to `/membership/apply`; submitting that form is the primary new-account flow (creates rows in `users`, `people`, and `membership_applications`, and starts a session).
