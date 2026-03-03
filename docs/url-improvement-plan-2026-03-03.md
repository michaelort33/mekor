# URL-by-URL Improvement Plan and Execution (March 3, 2026)

This plan compares each mapped URL against the original site structure/assets and defines a native React/T3 improvement path.

Execution standard used:
- No mirror rendering for mapped routes.
- Native React/TypeScript page ownership.
- Original visual assets reused where they improve quality.
- Upgraded design system usage (`MarketingPageShell`, `HeroSection`, `SectionCard`, `CTACluster`) with better hierarchy and CTA flow.

## 1) Homepage
### `/`
- Original cues: strong hero image, community overview, events/rabbi sections.
- Plan: preserve strong hero intent, improve edge-to-edge crop behavior, unify CTA styling, keep trust/contact blocks prominent.
- Implemented: global hero media defaults updated to `cover`; motion and card reveal improvements applied across native marketing pages.

## 2) Membership
### `/membership`
- Original cues: rates, categories, join guidance.
- Plan: keep pricing clarity, tighten CTA hierarchy, preserve contact/join pathways.
- Implemented: existing native page retained; benefits from global hero crop and animation improvements.

## 3) Events Hub
### `/events`
- Original cues: calendar-driven discovery and event cards.
- Plan: maintain current-month-first behavior, quick month pagination, stronger event card clarity.
- Implemented: existing native calendar experience retained; event detail template upgraded (see #28/#29).

## 4) Donations
### `/donations`
- Original cues: sponsorship context, donation channels, embedded payment.
- Plan: keep multi-channel donation UX, preserve embedded payment convenience, add stronger visual trust signals.
- Implemented: existing native page retained; global hero/card presentation upgraded.

## 5) Kiddush
### `/kiddush`
- Original cues: sponsorship options and community context.
- Plan: keep sponsorship pathways obvious with improved visual hierarchy.
- Implemented: existing native page retained; global visual improvements applied.

## 6) Center City Beit Midrash
### `/center-city-beit-midrash`
- Original cues: class schedule graphics, learning mission, Amud Yomi emphasis.
- Plan: rebuild native page with image-backed hero/banner, explicit schedule cards, mission section, learning CTAs.
- Implemented:
  - Native page rebuilt with dedicated module styles.
  - Added assets:
    - `public/images/beit-midrash/hero.jpeg`
    - `public/images/beit-midrash/banner.jpg`
  - Added structured schedule and Amud Yomi sections with actionable links.

## 7) Davening
### `/davening`
- Original cues: timetable-centric, participation details.
- Plan: maintain schedule fidelity and improve visual scanability.
- Implemented: existing native page retained; inherits updated hero/card behavior.

## 8) About Us
### `/about-us`
- Original cues: mission/history narrative.
- Plan: maintain narrative with stronger visual rhythm and CTA continuity.
- Implemented: existing native page retained; global visual improvements applied.

## 9) Our Leadership
### `/our-leadership`
- Original cues: board photos and bios.
- Plan: rebuild as native portrait/bio cards with clear board contact CTA.
- Implemented:
  - Native page rebuilt with dedicated module styles.
  - Added leadership hero + board member image assets in `public/images/leadership/`.
  - Added board contact cluster.

## 10) Our Rabbis
### `/our-rabbi`
- Original cues: rabbi profiles beneath banner.
- Plan: keep banner restrained, prioritize profile cards and readability.
- Implemented: existing native page retained; global hero crop defaults improved.

## 11) Visit Us
### `/visit-us`
- Original cues: contact details, map presence, WhatsApp/community guidance.
- Plan: rebuild native with location card, embedded map, contact form, WhatsApp group cards.
- Implemented:
  - Native page rebuilt with dedicated module styles.
  - Added assets in `public/images/visit-us/`.
  - Added Google Maps embed and improved visit funnel.

## 12) Contact Us
### `/contact-us`
- Original cues: direct communication form + practical contact data.
- Plan: rebuild native with stronger contact details, map, and form-first conversion flow.
- Implemented:
  - Native page rebuilt with dedicated module styles.
  - Added assets in `public/images/contact-us/`.
  - Added embedded map, refined contact cards, and CTA cluster.

## 13) In The News
### `/in-the-news`
- Original cues: publication credibility and article list.
- Plan: preserve source trust visibility and improve content scanning.
- Implemented: existing native page retained; global visual polish applied.

## 14) Our Community
### `/our-communities`
- Original cues: history + mission + communal identity.
- Plan: rebuild native with image-led hero/banner and structured history/mission/value cards.
- Implemented:
  - Native page rebuilt with dedicated module styles.
  - Added assets in `public/images/our-communities/`.
  - Added improved outbound credibility links and community CTAs.

## 15) From The Rabbi’s Desk
### `/from-the-rabbi-s-desk`
- Original cues: teachings page with strong editorial tone.
- Plan: move to full marketing shell, add visual hero, keep podcast list as primary conversion surface.
- Implemented:
  - Rebuilt route into native marketing shell layout.
  - Added hero asset `public/images/rabbi-desk/hero.jpg`.
  - Added learning-related CTA cluster.

## 16) Philly Jewish Community
### `/philly-jewish-community`
- Original cues: resource directory + map/community pointers.
- Plan: keep resource utility but improve scanability and trust framing.
- Implemented: existing native page retained; global presentation improvements applied.

## 17) Kosher Directory (Unified)
### `/center-city`
- Original cues: neighborhood-specific listings and featured imagery.
- Plan: keep unified directory with fast in-place filtering and richer visuals.
- Implemented: route remains native unified directory; no mirror rendering. Prior improvements preserved (in-place filtering + consolidated neighborhoods).

## 18) Main Line / Manyunk
### `/main-line-manyunk`
- Original cues: separate neighborhood listing page.
- Plan: preserve deep-link behavior but route into unified native directory filter.
- Implemented: permanent redirect to unified `/center-city?neighborhood=main-line-manyunk#kosher-directory`.

## 19) Old York Road / Northeast
### `/old-yorkroad-northeast`
- Original cues: separate neighborhood listing page.
- Plan: preserve deep-link behavior but route into unified native directory filter.
- Implemented: permanent redirect to unified `/center-city?neighborhood=old-yorkroad-northeast#kosher-directory`.

## 20) Cherry Hill
### `/cherry-hill`
- Original cues: separate neighborhood listing page.
- Plan: preserve deep-link behavior but route into unified native directory filter.
- Implemented: permanent redirect to unified `/center-city?neighborhood=cherry-hill#kosher-directory`.

## 21) Auxiliary & Alumni Membership
### `/auxiliary-membership`
- Original cues: separate membership tier information.
- Plan: keep native dedicated pricing/eligibility path with stronger conversion CTAs.
- Implemented: existing native page retained; no mirror dependency.

## 22) Kosher Map
### `/kosher-map`
- Original cues: map-first browsing.
- Plan: keep map utility while connecting back into unified filtered directory.
- Implemented: existing native page retained; still linked into unified directory paths.

## 23) Volunteer
### `/team-4`
- Original cues: richer volunteer role definitions and outreach content.
- Plan: keep expanded native sections and stronger form capture.
- Implemented: existing native rebuilt page retained with expanded roles and improved form fields.

## 24) Mekor Bulletin Board
### `/mekor-bulletin-board`
- Original cues: high-density announcements and practical community links.
- Plan: full native rebuild with all old bulletin content restored and better sectioned UX.
- Implemented:
  - Native page rebuilt with dedicated module styles.
  - Added route-specific assets in `public/images/bulletin-board/`.
  - Restored major legacy content blocks and CTAs.

## 25) Israel
### `/israel`
- Original cues: solidarity/community project storytelling.
- Plan: preserve narrative depth while improving readability and content hierarchy.
- Implemented: existing native page retained; global visuals enhanced.

## 26) Testimonials
### `/testimonials`
- Original cues: quote-heavy social proof.
- Plan: rebuild native with quote cards, stronger readability, and trust-driving CTA paths.
- Implemented:
  - Native page rebuilt with dedicated module styles.
  - Added assets in `public/images/testimonials/`.
  - Added quote grid and action links.

## 27) Mekor Couples
### `/mekorcouples`
- Original cues: milestones list, celebrations, community identity.
- Plan: replace missing/stub behavior with native page including marriage timeline and contribution CTA.
- Implemented:
  - New native route created: `app/mekorcouples/page.tsx`.
  - Added module styles and assets in `public/images/mekor-couples/`.

## 28) Event Detail: Purim at Mekor
### `/events-1/purim-at-mekor`
- Original cues: poster-like hero, key facts, location details.
- Plan: improve event template visual treatment and actionability.
- Implemented:
  - Event template upgraded with improved hero image behavior and action buttons.
  - Added location-to-maps action in template footer controls.

## 29) Event Detail: Mekor’s Tot Shabbat
### `/events-1/mekors-tot-shabbat`
- Original cues: family-focused event context with image and details.
- Plan: same upgraded event template system as above.
- Implemented:
  - Inherits upgraded native event template visuals and CTA behavior.

---

## Global Improvements Applied Across Mapped URLs
- Hero image default rendering switched to true cover behavior to eliminate letterboxing/edge bands.
- Added subtle section/hero motion with reduced-motion fallback.
- Upgraded route ownership list to include newly native pages (`/`, `/kiddush`, `/membership`, `/our-leadership`, `/mekorcouples`).
- Removed mapped-route reliance on medium-template wrappers for:
  - `/center-city-beit-midrash`
  - `/our-leadership`
  - `/visit-us`
  - `/contact-us`
  - `/our-communities`
  - `/testimonials`

## Remaining Deeper Optimization Opportunities (Post-Launch)
- Compress or convert some newly added JPG/PNG assets to AVIF/WebP variants for faster LCP on slower devices.
- Add per-route visual parity baseline for all 29 mapped routes (not just current six-route parity set).
- Expand structured trust signals (member counts, years active, partner badges) where content owners approve messaging.
