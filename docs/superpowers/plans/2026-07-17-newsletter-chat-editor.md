# Newsletter Chat Studio Implementation Plan (corrected)

> Post-audit architecture: **DB-first Chat Studio** — no Vercel Sandbox dependency and no Blob HTML version store/migration.

**Goal:** Ship an admin newsletter chat studio with AI SDK tools editing `newsletter_templates.body_html`, local HTML sanitize/lint, and the existing SendGrid send path.

**Architecture:** `/admin/templates/[id]/studio` split view. Chat via AI SDK `useChat` → `/api/admin/templates/chat`. Working HTML in Postgres. Send unchanged.

**Tech Stack:** Next.js 16, AI SDK (`ai`, `@ai-sdk/react`), Drizzle, AdminShell + CSS modules.

## Global Constraints

- Admin-only via `requireAdminActor`
- Max HTML ~120k chars; sanitize scripts on every write
- Local lint/sanitize only (no Sandbox microVM)
- No Blob version browser / no Blob schema columns required
- Keep `/edit` and `/api/admin/templates/ai` during transition

## Tasks

- [x] HTML sanitize helpers + unit tests
- [x] Chat API + DB tools (get/set/patch HTML, metadata, validateHtml)
- [x] Studio UI (chat + preview/source/details + send)
- [x] Links from list/edit
- [x] Remove Sandbox + Blob versioning from scope (architecture correction)
- [x] Sensitive inquiry Blob URL cleanup (merged)
- [x] Lint/build/tests
