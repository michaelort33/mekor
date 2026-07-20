# Tisha B'Av 5786 Event + Data-Driven Homepage Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> This run: executed inline (superpowers:executing-plans) in the authoring session — autonomous session, full context already loaded.

**Goal:** Publish the Tisha B'Av 5786 event (Jul 22–23, 2026) through the existing data-driven events system, add a featured-event card to the homepage, and close timezone/featured/status gaps.

**Architecture:** Keep the two existing sources of truth — the Neon `events` table (listing data, read via `getManagedEvents`) and the hand-authorable generated content bundles (detail page) — and extend them: a tz-pinned formatting helper, `featured`/`status`/`summary` on `ManagedEvent`, an optional structured `schedule` on the event template, and a featured card on the homepage. Spec: `docs/superpowers/specs/2026-07-20-tisha-bav-event-and-homepage-events-design.md`.

**Tech Stack:** Next.js 16 (App Router, RSC), Drizzle + postgres.js on Neon, zod contracts, node:test via tsx, CSS modules + global template CSS.

## Global Constraints

- Event wall-clock times come from the flyers and are `America/New_York`; stored instants must use explicit offsets (`2026-07-22T20:15:00-04:00`), never machine-local `new Date(y,m,d,h)`.
- Preserve flyer content verbatim in the detail schedule (times like `8:15pm`, `~7:30am`, labels like `Maariv followed by Megilat Eicha`).
- Do not invent details: no street address on the event, no registration URL, no hero image (`heroImage: ""`).
- No hard-coded event content in `app/page.tsx` (homepage stays data-driven).
- Match existing visual patterns in `app/page.module.css` (palette `#2b5a81`/`#eef2f8`, borders `#d9dde8`, radius 16px, existing font stacks).
- All existing tests keep passing; worktree baseline has 4 pre-existing failures from placeholder `DATABASE_URL` (`ENOTFOUND host`): native-routes, newsletter-chat-studio, newsletter-studio-live, site-feedback.

---

### Task 1: Event status + timezone-pinned date parts

**Files:**
- Modify: `lib/events/status.ts` (add `getEventStatus`)
- Create: `lib/events/format.ts`
- Test: `tests/events-status-format.test.ts`

**Interfaces:**
- Produces: `getEventStatus(input: {startAt?, endAt?}, now?): "upcoming" | "ongoing" | "past"`; `EVENT_TIME_ZONE = "America/New_York"`; `getEventDateParts(value: string | Date | null | undefined, timeZone?): { year, monthIndex, day, monthShort, monthLong, weekdayShort } | null`.
- `ongoing` requires an `endAt`: started AND not ended. No dates at all → `upcoming` (matches current undated-event behavior). `status === "past"` ⇔ `isEventPast`.

- [x] Write failing tests (status boundaries incl. no-end-time rule; date parts pin ET across the UTC midnight boundary and honor an explicit zone override)
- [x] Run: `npm test tests/events-status-format.test.ts` → FAIL (module not found)
- [x] Implement `getEventStatus` + `lib/events/format.ts` (Intl.DateTimeFormat + formatToParts)
- [x] Run test file → PASS; commit

### Task 2: `featured`, `summary`, `status` on ManagedEvent + contract

**Files:**
- Modify: `lib/events/store.ts` (export `toManagedEvent`; add fields from `sourceJson`)
- Modify: `lib/native/contracts.ts` (`managedEventContractSchema` + `featured: z.boolean(), summary: z.string(), status: z.enum([...])`)
- Test: `tests/events-status-format.test.ts` (extend)

**Interfaces:**
- Produces: `ManagedEvent` gains `featured: boolean` (`sourceJson.featured === true`), `summary: string` (`sourceJson.description` if string, else ""), `status: EventStatus` (via `getEventStatus`). `toManagedEvent(row)` exported for tests.

- [x] Extend test: `toManagedEvent` surfaces the three fields; `isPast ⇔ status==="past"`; result validates through `validateManagedEventsContract`
- [x] Run → FAIL; implement; run → PASS; commit

### Task 3: Structured schedule on the event template

**Files:**
- Modify: `lib/templates/template-data.ts` (`EventScheduleDay` type; `schedule?: EventScheduleDay[]` on `EventTemplateData`)
- Modify: `components/templates/event-template.tsx` (render day-grouped lists between facts and about)
- Modify: template CSS (global stylesheet holding `.template-content` styles) — `.template-event-schedule` styles
- Check: `lib/content/types.ts` for how `NativeTemplateRecord.data` is typed (update if it re-declares the shape)

**Interfaces:**
- Produces: `EventScheduleDay = { dayLabel: string; items: Array<{ time: string; label: string }> }`. Absent schedule → rendering identical to today.

- [x] Add type + render (semantic: `h2` day label + `ul`; time in a `<span>`); style consistent with template card
- [x] Commit (covered by Task 5's content-integrity test; no render-test infra in house style)

### Task 4: Homepage featured card + tz-pinned chips; calendar tz bucketing

**Files:**
- Modify: `app/page.tsx` (use `getEventDateParts` for chips; split featured/rest; `FeaturedEventCard`; "Happening now" for ongoing)
- Modify: `app/page.module.css` (`.eventFeature*` styles)
- Modify: `app/events/events-calendar.tsx` (bucket months/days via `getEventDateParts`; month grid math via `Date.UTC` on parts)
- Test: `tests/tisha-bav-event-content.test.ts` (source contract: no hard-coded event strings in page.tsx; calendar + page import the format helper)

**Interfaces:**
- Consumes: Task 1 `getEventDateParts`, Task 2 `featured`/`status`/`summary`.
- Featured = `upcoming.filter(e => e.featured)` within the same `HOME_EVENTS_LIMIT` window; card shows range-aware date chip (`22–23` same-month), title link, `timeLabel · location` meta, summary line, "View details & schedule" CTA.

- [x] Implement homepage + CSS + calendar changes
- [x] Run full test suite → no new failures; commit

### Task 5: Tisha B'Av 5786 content (bundles + DB script)

**Files:**
- Modify: `lib/content/generated/{documents,index,templates,routes,search}.json`
- Create: `scripts/db/add-tisha-bav-5786-event.ts`
- Test: `tests/tisha-bav-event-content.test.ts`

**Interfaces:**
- Consumes: Task 3 `schedule` shape. Path `/events-1/tisha-bav-5786`, doc id `a17e2026tishabav5786event000000000abcdef` (unique), `capturedAt 2026-07-20T12:00:00.000Z`.
- DB row: startAt `2026-07-22T20:15:00-04:00`, endAt `2026-07-23T20:57:00-04:00`, shortDate `Jul 22–23, 2026`, timeLabel `Wed 8:15 PM – Thu 8:57 PM`, location `Mekor Habracha · Center City Synagogue`, sourceJson `{heroImage:"", description, canonical, headings, featured:true, schedule}`.

- [x] Write failing integrity test: consistent entries across all five bundles; schedule times/labels/day labels pinned verbatim to the flyer; routes canonical + search entry present; DB script contains explicit-offset instants; `app/page.tsx` contains no event-specific literals
- [x] Run → FAIL; author bundle entries + script; run → PASS; commit

### Task 6: Execute DB insert + full verification

- [x] `npm test` → only the 4 baseline failures remain
- [x] `npm run lint` on touched files → clean (repo-wide has pre-existing warnings)
- [x] `npm run build` (worktree env) → compiles; static generation for `/events-1/tisha-bav-5786`
- [x] Run `scripts/db/add-tisha-bav-5786-event.ts` with the real env (main repo `.env.local`) → row upserted; verify via read-back
- [x] Dev-server preview with real DB: homepage featured card, events hub card, detail page schedule; screenshots
- [x] Commit docs (spec + plan); push branch; open PR flagging the merge-before-Wednesday note

### Self-review

Spec coverage: D1→Task 5/6, D2→Tasks 1/4, D3→Task 2, D4→Tasks 3/4, D5→PR text. Types consistent (`EventStatus`, `EventScheduleDay`, `getEventDateParts` signature identical across tasks). No placeholders. Checkboxes above are marked as executed during the inline run.
