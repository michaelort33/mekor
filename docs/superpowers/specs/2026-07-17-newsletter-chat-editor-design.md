# Newsletter Chat Editor (Full Vision) — Design Spec

**Date:** 2026-07-17  
**Status:** Awaiting approval  
**Scope choice:** Option C — chat + Sandbox + Blob browser + send in one delivery track (phased internally, but designed end-to-end)

## 1. Problem

Admin newsletter creation today is a dense form at `/admin/templates/[id]/edit`:

- Many metadata fields
- One-shot OpenAI generation (`/api/admin/templates/ai`)
- Large raw HTML textarea as source of truth
- Separate preview / send / schedule controls on the same page

We want editors to **chat** with a Vercel-hosted agent that can safely transform HTML (Sandbox), persist versions to **Blob**, browse those files from the UI, finalize a version, and send via the existing SendGrid campaign pipeline.

## 2. Goals / Non-goals

### Goals

1. Split-view newsletter editor: chat (left) + preview/source (right).
2. Multi-turn agent via AI SDK + AI Elements (shadcn-based).
3. Agent tools that read/write template HTML and optionally run Sandbox transforms/validation.
4. Versioned HTML stored in Vercel Blob, browsable from the admin UI.
5. Finalize → send uses the latest approved HTML without rewriting the whole campaign system.
6. Admin-only; audited; no public exposure of write APIs.

### Non-goals

- Replacing SendGrid or the `message_campaigns` delivery queue.
- Public-facing chat or subscriber-facing AI.
- Full visual (drag-drop) email builder.
- Using the separate **Vercel Agent** product (code review / prod investigation) — we mean an **AI SDK agent** + Sandbox.

## 3. Product architecture

```
┌──────────────────────── /admin/templates/[id]/studio ───────────────────────┐
│ ┌──────────────── chat pane ────────────────┐  ┌──── workspace pane ─────┐ │
│ │ AI Elements Conversation + PromptInput    │  │ Tabs: Preview | Source  │ │
│ │ useChat → /api/admin/templates/chat       │  │      | Versions | Meta  │ │
│ │ Tool cards (read/write/validate/blob)     │  │ Live iframe preview     │ │
│ └───────────────────────────────────────────┘  │ Blob file browser       │ │
│                                                │ Finalize + Send actions │ │
└────────────────────────────────────────────────┴─────────────────────────┘
                              │
                              ▼
┌────────────────────────── Agent runtime (server) ──────────────────────────┐
│ AI Gateway model via AI SDK streamText / ToolLoopAgent                      │
│ Tools:                                                                      │
│  - getTemplateHtml / setTemplateHtml (working copy)                         │
│  - listBlobVersions / readBlobVersion / writeBlobVersion                    │
│  - validateOrTransformHtml (Vercel Sandbox)                                 │
│  - updateMetadata (optional structured fields)                              │
└────────────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
        Postgres           Vercel Blob      Sandbox microVM
   (template row +      (versioned HTML)   (safe HTML ops)
    campaign snapshot)
```

## 4. Data model

### 4.1 Keep Postgres as campaign source of truth

`newsletter_templates` remains the row admins edit/send from. Extend it:

| Column | Type | Purpose |
|---|---|---|
| `body_html` | `text` (existing) | **Active** HTML used for preview/send snapshot |
| `active_blob_pathname` | `varchar` nullable | Blob path of the active version |
| `active_blob_url` | `text` nullable | Public/private Blob URL for active version |
| `active_blob_version_id` | `varchar` nullable | Blob version / etag / generation id |

On **Finalize** (and on successful agent `writeBlobVersion` that is marked active): write Blob, then copy HTML into `body_html` so send/archive keep working unchanged.

### 4.2 Blob layout

```
mekor/newsletters/templates/{templateId}/
  working.html                 # optional scratch (or omit; keep working copy in DB/session)
  versions/{isoTimestamp}-{shortId}.html
  latest.html                  # pointer copy of active version (optional convenience)
```

Each version write stores:

- HTML bytes (`text/html; charset=utf-8`)
- Metadata via Blob `addRandomSuffix` / custom path + companion JSON sidecar optional:

```
versions/{id}.html
versions/{id}.meta.json   # { promptSummary, actorUserId, createdAt, byteLength, contentSha256 }
```

### 4.3 Chat persistence (minimal Phase C)

- **MVP:** ephemeral chat in client memory for the studio session (refresh loses thread).
- **Follow-up table (same delivery if time):** `newsletter_template_chats` with `{ id, templateId, messagesJson, createdAt, updatedAt }` for resume.

C includes Blob + Sandbox + send; chat history persistence is included if low-cost, otherwise deferred with a clear TODO in the PR.

## 5. UI design

### 5.1 New route (preferred)

`/admin/templates/[id]/studio` — dedicated studio page so we do not further densify the existing edit form.

- Keep `/edit` for metadata-heavy / legacy flow initially.
- Add primary CTA **“Open Chat Studio”** from list + edit pages.
- Later (optional cleanup PR): make studio the default edit experience.

### 5.2 Layout

- Desktop: `grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1.15fr)`
- Mobile: stacked; chat first, then preview tabs
- Chat uses **AI Elements**:
  - `Conversation`, `ConversationContent`, `ConversationScrollButton`
  - `Message`, `MessageContent`, `MessageResponse`
  - `PromptInput*` family
  - `Tool` for tool-call visibility
  - `CodeBlock` when agent shows HTML diffs/snippets
- Workspace tabs:
  - **Preview** — sandboxed iframe (`sandbox` attribute, `srcDoc`)
  - **Source** — read-only or lightly editable HTML (optional manual tweak)
  - **Versions** — Blob file browser (list, open, copy URL/path, activate, duplicate-as-new)
  - **Details** — subject/title/slug/publishOnSend (compact)

### 5.3 Actions

- **Apply from chat** — agent already applies via tools; UI reflects streaming updates
- **Save version** — force Blob write of current working HTML
- **Activate version** — set Blob file → update `body_html` + active blob columns
- **Send / Schedule** — reuse existing `/api/admin/templates/send` against activated `body_html`
- **Copy HTML / Copy Blob URL** — clipboard helpers in Versions tab

## 6. Agent & API design

### 6.1 Dependencies to add

- `ai` (AI SDK)
- `@ai-sdk/*` only if not using Gateway string models; prefer Gateway: `model: 'openai/gpt-4.1-mini'` (or env override)
- `@vercel/sandbox`
- AI Elements via `npx ai-elements@latest` / `npx shadcn@latest add @ai-elements/...`
- Initialize `components.json` if missing (project already has partial `components/ui`)

### 6.2 Chat endpoint

`POST /api/admin/templates/chat`

- Auth: `requireAdminActor()`
- Body: AI SDK UI message stream protocol (`useChat` default transport)
- Context header/query: `templateId` (required)
- Loads template row; builds system prompt for synagogue email HTML (inline CSS, no scripts, accessibility basics, Mekor tone)
- `streamText` / agent loop with tools bound to that `templateId` + actor
- Audit log: chat session start + each mutating tool

Env:

- Prefer `AI_GATEWAY_API_KEY` (docs recommendation)
- Fallback: existing `OPENAI_API_KEY` via Gateway/OpenAI provider bridge if Gateway unset
- Sandbox: `VERCEL_OIDC_TOKEN` locally via `vercel env pull`; automatic on Vercel

### 6.3 Tools

| Tool | Mutates | Behavior |
|---|---|---|
| `getTemplateHtml` | no | Return current working HTML (+ meta summary) |
| `setTemplateHtml` | yes | Replace working HTML in DB `body_html` (draft) and notify UI via tool result |
| `patchTemplateHtml` | yes | Optional surgical replace (find/replace or section id) for smaller diffs |
| `updateTemplateMetadata` | yes | Patch title/subject/previewText/etc. with zod validation |
| `listBlobVersions` | no | List Blob paths under template prefix |
| `readBlobVersion` | no | Fetch HTML for a pathname |
| `writeBlobVersion` | yes | Write new version; optionally `activate: true` to sync DB |
| `activateBlobVersion` | yes | Copy Blob HTML → `body_html` + active columns |
| `validateHtml` | no* | Run Sandbox script: parse HTML, strip scripts, check size, basic email lint; return report |
| `transformHtmlInSandbox` | yes* | Run agent-generated or fixed transform script in Sandbox against current HTML; return new HTML; require explicit activate/set |

\*Sandbox tools never receive DB credentials or Blob tokens inside the VM. Host passes HTML in/out only.

### 6.4 Sandbox policy

- Runtime: `node22` or `node24`
- Timeout: 30–60s
- Resources: small (1–2 vCPU)
- Network: deny by default if SDK supports restriction; if not, prompt + no secrets in sandbox env
- Input: write `input.html` + `transform.mjs` into sandbox
- Output: read `output.html` + stdout report
- Always `sandbox.stop()` in `finally`
- Do **not** mount production env secrets into the sandbox

### 6.5 Blob admin APIs (frontend access)

Admin-only REST for the Versions tab (in addition to agent tools):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/templates/[id]/blob` | List versions |
| `GET` | `/api/admin/templates/[id]/blob/[...path]` | Read one file |
| `POST` | `/api/admin/templates/[id]/blob` | Upload/save new version from UI |
| `POST` | `/api/admin/templates/[id]/blob/activate` | Activate pathname |
| `DELETE` | `/api/admin/templates/[id]/blob` | Delete non-active version (optional) |

All require admin actor + audit on mutate.

## 7. Send integration

No change to cron / SendGrid / delivery tables.

Finalize path:

1. Editor activates a Blob version (or chat tool with `activate: true`)
2. Server loads HTML → updates `newsletter_templates.body_html` (+ blob columns)
3. Existing **Send now / Schedule** calls `POST /api/admin/templates/send`
4. Campaign creation snapshots `body` from DB as today
5. `publishOnSend` still creates `newsletter_issues` from campaign body

Guardrails:

- Refuse send if `body_html` empty
- Optional: refuse send if `active_blob_pathname` missing (warn only in v1 so legacy templates still send)
- Preview recipients unchanged

## 8. Security

- All studio + chat + blob routes behind existing admin edge policy + `requireAdminActor`
- Iframe preview uses `sandbox` attribute; CSP-friendly `srcDoc`
- Strip `<script>`, `on*=` handlers, `javascript:` URLs on every write (`setTemplateHtml` / Blob write / Sandbox output)
- Max HTML size (align with current AI route ~120k chars; Blob soft cap e.g. 500KB)
- Rate-limit chat mutations per admin (simple in-memory/DB throttle)
- Sandbox: no secrets, short timeout, capture stdout/stderr only
- Audit: `template.chat`, `template.blob.write`, `template.blob.activate`, reuse existing send audits

## 9. Migration / compatibility

1. Add nullable blob columns via Drizzle migration
2. Existing templates keep working (`body_html` only)
3. First studio open: seed `versions/initial-{ts}.html` from current `body_html` if no Blob versions exist
4. Keep `/admin/templates/[id]/edit` until studio is trusted
5. Deprecate one-shot `/api/admin/templates/ai` only after studio parity (leave endpoint during transition)

## 10. Implementation slices (still Option C, sequenced for ship risk)

| Slice | Deliverable | Done when |
|---|---|---|
| **C0** | Spec approved; branch + deps plan | This doc approved |
| **C1** | shadcn/AI Elements init + empty studio shell split view | Page renders chat+preview chrome |
| **C2** | Chat API with `get/setTemplateHtml` + streaming UI | Chat edits draft HTML + preview updates |
| **C3** | Blob list/read/write/activate APIs + Versions tab | Versions browsable; activate syncs DB |
| **C4** | Sandbox `validateHtml` (+ optional transform) tools | Tool cards show lint/transform results |
| **C5** | Wire Finalize + Send/Schedule from studio; seed migration; audits; tests | End-to-end: chat → version → send preview |

C1–C5 ship as one feature branch/PR series (or one PR with stacked commits) targeting full vision.

## 11. Testing plan

- Unit: HTML sanitizer; Blob path builder; activate sync mapping
- API: admin gate 401/403; chat rejects missing templateId; blob activate updates `body_html`
- Integration: mock AI SDK stream + mock Sandbox command; assert tool loop updates DB
- Manual: studio at 1440/768; chat edit → save version → activate → send preview (admins_only)

## 12. Env / ops checklist

| Var | Required for |
|---|---|
| `AI_GATEWAY_API_KEY` (preferred) or `OPENAI_API_KEY` | Chat models |
| `BLOB_READ_WRITE_TOKEN` | Version storage |
| `VERCEL_OIDC_TOKEN` (local) | Sandbox + Gateway on laptop |
| Existing SendGrid + `DATABASE_URL` | Send path |

## 13. Open points (defaults chosen)

| Topic | Default for C |
|---|---|
| Private vs public Blob | **Private Blob** + admin fetch proxy (no public newsletter draft URLs) |
| Manual source editing | Allowed in Source tab; saves as new Blob version |
| Chat history DB | Include thin `newsletter_template_chats` if ≤1 day extra; else session-only |
| Model | Gateway `openai/gpt-4.1-mini` with `OPENAI_EMAIL_TEMPLATE_MODEL` override |
| Transform freedom | Sandbox validate always; transform only via allowlisted scripts in v1 (safer than arbitrary agent code) |

---

## Spec self-review

- [x] No TBD placeholders for core architecture
- [x] Explicit that Vercel Agent product ≠ in-app agent
- [x] Blob + DB hybrid avoids breaking SendGrid pipeline
- [x] Sandbox never receives secrets
- [x] Scope is Option C with internal slices C1–C5
- [x] Insertion points map to real routes (`/admin/templates`, existing send API)

## Approval

Reply **approve** (or note edits) to this spec. After approval, the next step is an implementation plan via the writing-plans skill, then build slices C1→C5.
