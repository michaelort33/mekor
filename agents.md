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
