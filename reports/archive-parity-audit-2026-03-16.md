# Archive Parity Audit - 2026-03-16

## Scope

- Archived evidence reviewed from:
  - `/Users/meshulumort/Documents/mekor/old-archived-version/127.0.0.1_8081/dl/ua=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F605.1.15%20(KHTML%2C%20like%20Gecko)%20Version%2F17.2.1%20Safari%2F605.1.15&mobile=false&url=https%3A%2F%2Fwww.mekorhabracha.org%2F.html`
- Important limitation:
  - The archive does not contain a full mirrored set of interior-page HTML files.
  - Most evidence comes from the archived homepage and embedded Wix widget payloads inside that file.

## High-Priority Discrepancies

1. Main navigation hierarchy no longer matches the archived homepage.
   - Archived homepage top row exposes `Membership`, `Events`, `Donate`, `Kiddush`, and `Center City Beit Midrash` as primary items.
   - Current nav changes this to `Join`, `Events`, `About`, `Kosher Guide`, and `More`, pushing several formerly primary destinations into overflow.
   - Current source: `/Users/meshulumort/Documents/mekor/lib/navigation/site-menu.ts`
   - Archive evidence: archived homepage anchor set includes direct links for `Membership`, `Donate`, `Kiddush`, and `Center City Beit Midrash`.

2. Homepage no longer surfaces the archived support-commerce block.
   - Archived homepage prominently included `Support Mekor while buying wine and Judaica!` with Mekor-specific links to `Kosherwine.com`, `Judaica.com`, `tinyurl.com/mekorwine`, and `tinyurl.com/mekorjudaica`.
   - Current homepage removes that support content entirely.
   - Current source: `/Users/meshulumort/Documents/mekor/app/page.tsx`
   - Archive evidence: archived homepage text and anchor set include those support links.

3. Homepage no longer exposes the archived video introduction block as a distinct homepage module.
   - Archived homepage includes the welcoming copy plus an embedded video experience in the opening section.
   - Current homepage retains the YouTube iframe, but the surrounding structure has been simplified and some homepage narrative density from the archived section is reduced.
   - Current source: `/Users/meshulumort/Documents/mekor/app/page.tsx`
   - Archive evidence: welcoming-community copy plus embedded homepage media in the archived document.

4. Footer/support surface area is reduced compared with the archive.
   - Archived homepage footer/contact zone exposes phone, email, address, newsletter signup, newsletter archive, and social links together on the homepage.
   - Current homepage keeps those, but non-homepage marketing pages fall back to the shared footer that drops the on-page newsletter form and uses a lighter CTA-card treatment instead.
   - Current sources:
     - `/Users/meshulumort/Documents/mekor/app/page.tsx`
     - `/Users/meshulumort/Documents/mekor/components/marketing/page-shell.tsx`
   - Archive evidence: homepage contact/footer block with direct newsletter signup and archive link.

## Medium-Priority Discrepancies

1. Top-level information scent for kosher content changed materially.
   - Archived homepage exposes area-specific kosher links directly:
     - `Center City & Vicinity`
     - `Main Line/Manyunk`
     - `Old York Road/Northeast`
     - `Cherry Hill`
     - `Kosher Map`
   - Current nav collapses this under `Kosher Guide`, which is structurally cleaner but less explicit and less archive-faithful.
   - Current source: `/Users/meshulumort/Documents/mekor/lib/navigation/site-menu.ts`

2. Archived homepage explicitly promotes `Latest Newsletters` from two places; most internal pages now only expose it through the generic marketing footer cards.
   - Homepage parity is mostly intact.
   - Interior marketing pages are less aggressive about surfacing the newsletter archive than the archived experience implied.
   - Current source: `/Users/meshulumort/Documents/mekor/components/marketing/page-shell.tsx`

3. Archived homepage event widget behavior was richer than the current simplified homepage event card.
   - Archived Wix payload includes a structured events widget with RSVP state, sold-out logic, calendar links, schedule text, and event metadata for `Mekor’s Tot Shabbat`.
   - Current homepage only renders a simple single upcoming-event card with `More info` and `RSVP` links.
   - Current source: `/Users/meshulumort/Documents/mekor/app/page.tsx`
   - Archive evidence: serialized Wix events payload in the archived homepage document.

4. Archived homepage appears to emphasize both rabbis through separate profile treatments plus external channels.
   - Current homepage preserves the rabbi cards and major outbound links, so this is mostly aligned.
   - Remaining discrepancy is tone and density rather than missing destination coverage.
   - Current source: `/Users/meshulumort/Documents/mekor/app/page.tsx`

## Membership-Specific Findings

1. Auxiliary membership is now better exposed on `/membership`, but the archived site still treated it as a first-class discoverable destination from the broader menu system.
   - Current nav places `Auxiliary & Alumni Membership` under `More`.
   - Archived homepage included a direct menu link for `Auxiliary & Alumni Membership`.
   - Current sources:
     - `/Users/meshulumort/Documents/mekor/lib/navigation/site-menu.ts`
     - `/Users/meshulumort/Documents/mekor/app/membership/page.tsx`

2. Membership year copy was previously drifting; this is now corrected and centralized.
   - Current sources:
     - `/Users/meshulumort/Documents/mekor/lib/calendar/hebrew-year.ts`
     - `/Users/meshulumort/Documents/mekor/app/membership/page.tsx`
     - `/Users/meshulumort/Documents/mekor/app/auxiliary-membership/page.tsx`
     - `/Users/meshulumort/Documents/mekor/lib/membership/applications.ts`

## Low-Priority Or Mostly-Aligned Areas

1. Contact details are aligned.
   - Archive and current homepage both expose:
     - `(215) 525-4246`
     - `admin@mekorhabracha.org`
     - `1500 Walnut St Suite 206, Philadelphia, PA 19102`

2. Social destinations are aligned.
   - Archive and current homepage/footer both expose Instagram, YouTube, and Facebook group/community links.

3. Newsletter archive destination is aligned.
   - Current site still points to the same campaign archive used in the archived homepage.

## Recommended Follow-Up

1. Decide whether archive-faithful primary navigation matters more than the cleaner new grouping.
   - If parity is the priority, restore direct primary exposure for `Donate`, `Kiddush`, and `Center City Beit Midrash`.

2. Reintroduce the wine/Judaica support block somewhere intentional.
   - Best candidates are the homepage or donations page.

3. Decide whether the homepage should regain a richer events module.
   - Archive evidence supports a more feature-complete events surface than the current single-card summary.

4. If you want a true all-pages archive audit, capture or locate the full archived interior HTML set.
   - With the current archive payload, the homepage and embedded widget data are auditable.
   - Interior-page content parity cannot be verified exhaustively from this archive alone.
