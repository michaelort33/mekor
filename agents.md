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
