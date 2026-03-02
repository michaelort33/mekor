# McCarr Project Execution Constraints

## Rendering Rule: No Mirror Pages
- Do not use mirrored HTML/content rendering for production pages.
- Rebuild/maintain these pages as native React + TypeScript (T3-style stack) components.
- For parity work, prioritize pixel-close implementation: spacing, typography, breakpoints, and component behavior should match the original as closely as possible.
- If a page currently uses mirror fallback data (`mirror-*` helpers, `DocumentView`, `forceMirror`, mirrored routes), migrate it to native implementation before final approval.

