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
