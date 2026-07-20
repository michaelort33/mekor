# Tisha B'Av 5786 event + data-driven homepage events — design

Date: 2026-07-20
Status: Approved for autonomous implementation (detailed spec supplied by user; no live Q&A available)

## Goal

1. Publish the Tisha B'Av 5786 event (July 22–23, 2026, from the two supplied flyers) to the
   Events system and give it a prominent, design-consistent presence in the homepage events area.
2. Close the remaining gaps between the existing event architecture and the requested
   data-driven behavior: timezone-reliable display, featured events, explicit status
   derivation, and documented conventions.

## Current architecture (kept — it already satisfies most requirements)

- **Single source of truth (listing data):** `events` table in Neon Postgres
  (`db/schema.ts`), read through `getManagedEvents()` in `lib/events/store.ts`, validated by
  `managedEventContractSchema` (`lib/native/contracts.ts`). Consumed by the homepage
  (`app/page.tsx` → `HomeUpcomingEvents`) and the Events hub (`app/events/page.tsx` →
  `EventsCalendar`). No duplicated homepage content.
- **Detail pages:** `/events-1/<slug>` renders `EventTemplate` from generated bundles
  (`lib/content/generated/{documents,index,templates,routes,search}.json`). Hand-authored
  event definitions are merged into those bundles by `content:generate`,
  statically imported by `lib/content/native-content.ts`. The route resolves only if
  `routes.json` lists the path as canonical. Precedent: "An Evening with Yaakov Zimmerman"
  (`scripts/db/add-zimmerman-event.ts` + bundle entries).
- **Expiration:** `isEventPast` (`lib/events/status.ts`): past when
  `(endAt ?? startAt) <= now` — exactly the requested default (no end time → past after
  start). Multi-day events stay visible until `endAt`. Homepage filters `!isPast`, limit
  `HOME_EVENTS_LIMIT = 5`, has an empty state and a "View all events" link.
- **Past events access:** Events hub month view splits upcoming/past with a keyboard-operable
  `Past (n)` accordion (`aria-expanded`/`aria-controls`). Homepage never shows past events.
- **Admin:** `app/admin/events` manages registrations only; event records are created by
  idempotent scripts plus canonical hand-authored definitions that feed content generation
  (site is mid-migration off Wix; no CMS UI yet).

## Gaps found (verified against installed drizzle/postgres sources and live data)

1. **Timestamp convention:** Drizzle stores `Date.toISOString()` into `timestamp` (naive)
   columns and reads them back as UTC — i.e. the column value IS the UTC instant. The
   Zimmerman script built dates with machine-local `new Date(y,m,d,h)` — wrong instant unless
   the machine runs in America/New_York. New scripts must use explicit offsets
   (`2026-07-22T20:15:00-04:00`).
2. **Timezone-pinned display:** Homepage date chips and the calendar's month/day bucketing
   format Dates in the *runtime's* zone. On Vercel (UTC) an 8:15 PM ET event renders as the
   next day. All event date/day derivation must pin `America/New_York` (the synagogue's zone,
   where all events happen).
3. **No featured flag** and **no explicit status value** on `ManagedEvent`.

## Design decisions

### D1. Add Tisha B'Av 5786 from one canonical definition

- `scripts/db/add-tisha-bav-5786-event.ts`, upsert keyed on path (Zimmerman precedent), with:
  - slug `tisha-bav-5786`, path `/events-1/tisha-bav-5786`, title `Tisha B'Av 5786`
  - `startAt = 2026-07-22T20:15:00-04:00` (first flyer item, Mincha 8:15 PM),
    `endAt = 2026-07-23T20:57:00-04:00` (Fast Ends 8:57 PM) → the event stays in the
    upcoming/ongoing views through the end of the fast, then drops off automatically.
  - `shortDate "Jul 22–23, 2026"`, `timeLabel "Wed 8:15 PM – Thu 8:57 PM"`,
    `location "Mekor Habracha / Center City Synagogue"` (the flyer names only the synagogue;
    no street address is invented on the event record).
  - `sourceJson`: `heroImage: ""` (flyer images are not available as files in this session —
    no image is fabricated), canonical path, description summarizing only flyer content,
    `featured: true`, plus the full two-day `schedule` copied verbatim from the flyers.
- `lib/events/tisha-bav-5786.ts` is the canonical definition used by both the DB seed and
  `lib/content/hand-authored.ts`; `content:generate` merges the derived records into all five
  generated JSON bundles, so the detail page resolves, is searchable, and enters the sitemap.
- Detail page content: full schedule preserved exactly, rendered as a structured schedule
  (see D4), with a short factual intro. Registration/signup stays enabled-by-default like
  other events (the signup panel is feature-flagged site-wide and independent of this event).
- The script runs against the production DB in this session (idempotent; content addition is
  reversible by deleting the row). Consequence to flag in the PR: until this branch deploys,
  the live homepage/events hub list the event correctly but its detail link 404s — merge
  promptly (event begins Wed evening).

### D2. Timezone-safe event formatting (new `lib/events/format.ts`)

- `EVENT_TIME_ZONE = "America/New_York"` — single constant; all event date parts derive
  through `Intl.DateTimeFormat(..., { timeZone: EVENT_TIME_ZONE })`.
- `getEventDateParts(iso)` → `{ year, monthIndex, day, monthShort, weekdayShort }` used by:
  - homepage date chips (fixes the UTC-server next-day bug),
  - `EventsCalendar` month bucketing + day-of-month placement (fixes visitor-timezone skew).
- Pure functions, unit-tested with instants that cross the UTC date boundary (evening events).

### D3. `featured` + `status` on `ManagedEvent`

- `featured`: read from `sourceJson.featured === true` in `toManagedEvent`. No schema
  migration (consistent with `heroImage` in `sourceJson`; a real column is the upgrade path
  if/when an admin CRUD UI is built). Added to the strict zod contract.
- `status`: derived `"upcoming" | "ongoing" | "past"` via new `getEventStatus` in
  `lib/events/status.ts` (`ongoing` = started, not yet ended, requires `endAt`). Added to
  contract. `isPast` stays for backward compatibility (`status === "past"` ⇔ `isPast`).
- `cancelled` is NOT implemented (no current use case, needs display + admin treatment);
  proposed as follow-up. `isClosed` continues to mean "registration closed".

### D4. Homepage featured card + structured schedule on the detail template

- Homepage events section: featured upcoming/ongoing events render as a prominent card
  (`eventFeature`) above the existing compact rows; non-featured events keep the current
  rows. Card = date chip (range-aware, ET-pinned), title link, time · location meta,
  one-line description, "View details & schedule" CTA — all using the existing palette,
  fonts, radii from `app/page.module.css`. Ongoing featured events show a small
  "Happening now" label (derived from `status`). Featured events count toward
  `HOME_EVENTS_LIMIT` and are simply omitted (like all events) once past.
- `EventTemplateData` gains optional
  `schedule?: Array<{ dayLabel: string; items: Array<{ time: string; label: string }> }>`;
  `EventTemplate` renders it as day-grouped semantic lists (`h2` + `ul`) between the facts
  and the about text. Absent for legacy events → unchanged rendering.

### D5. Out of scope (proposed follow-ups, documented in PR)

- Admin CRUD UI for events (would replace the script+definition authoring path; at that point
  promote `featured` to a real column and add `cancelled`).
- Registration links to external systems (no such link exists on the flyers).

## Testing

House style is node:test with pure-function and source-regex tests (nav contract precedent):

1. `getEventStatus` boundaries (before start / between start+end / after end / no end).
2. `getEventDateParts` pins ET across the UTC midnight boundary (8:15 PM EDT event).
3. `toManagedEvent` surfaces `featured` + `status`; contract schema accepts the new fields.
4. Content-bundle integrity test for `/events-1/tisha-bav-5786`: consistent entries across
   documents/index/templates/routes/search; template schedule preserves every flyer line
   verbatim (times list pinned).
5. Homepage source contract: featured card markup is data-driven (no hard-coded event
   strings in `app/page.tsx`).

Review validation: the secretless suite completes with 263 tests, 261 passing and two
database-dependent skips.

## Assumptions (flyer data was complete; nothing else invented)

- Year 2026 for "July 22nd/23rd" (today is 2026-07-20; weekdays match the flyers; 5786 ✓).
- Event timezone America/New_York (synagogue's home; all site events are in Philadelphia).
- Event "start" = first scheduled item (Mincha 8:15 PM), "end" = "Fast Ends" 8:57 PM.
- No registration link, street address, or hero image exists in the source material — none
  fabricated; description text restates only flyer content.
