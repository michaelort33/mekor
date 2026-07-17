# Newsletter Chat Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship Option C — admin newsletter chat studio with AI SDK agent, Blob versions, Sandbox validate, and existing SendGrid send.

**Architecture:** New `/admin/templates/[id]/studio` split view. Chat via AI SDK `useChat` → `/api/admin/templates/chat` with tools. Working HTML in DB; versions in private Blob; activate syncs Blob→DB; send unchanged.

**Tech Stack:** Next.js 16, AI SDK (`ai`, `@ai-sdk/react`), `@vercel/blob`, `@vercel/sandbox`, Drizzle, existing AdminShell + CSS modules (AI Elements-style chat UI if CLI install is unreliable).

## Global Constraints

- Admin-only via `requireAdminActor`
- Max HTML ~120k chars; sanitize scripts on every write
- Sandbox never receives secrets; local fallback lint if OIDC missing
- Private Blob + admin proxy
- Keep `/edit` and `/api/admin/templates/ai` during transition

---

### Task 1: Schema + sanitizer + blob helpers
- [x] Extend `newsletterTemplates` with blob columns
- [x] Add SQL migration
- [x] `lib/newsletter/html-sanitize.ts`, `lib/newsletter/template-blob.ts`
- [x] Unit tests
- [x] Commit

### Task 2: Blob admin APIs
- [x] GET/POST list+write, activate, read routes
- [x] Audits
- [x] Commit

### Task 3: Chat API + tools
- [x] Install `ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `@vercel/sandbox`
- [x] Tool implementations + `/api/admin/templates/chat`
- [x] Sandbox validate with local fallback
- [x] Commit

### Task 4: Studio UI
- [x] `/admin/templates/[id]/studio` page + client studio
- [x] Chat pane, preview/source/versions/details tabs
- [x] Send/schedule reuse
- [x] Links from list/edit
- [x] Commit

### Task 5: Tests + ship
- [x] Tests for sanitize, blob paths, activate mapping, chat auth
- [x] Lint/build as feasible
- [x] Push + PR
