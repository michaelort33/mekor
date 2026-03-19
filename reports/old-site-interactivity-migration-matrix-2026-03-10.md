# Old-Site Interactivity Migration Matrix

Source files:
- `/Users/meshulumort/Documents/mekor/reports/old-site-interactivity-audit-2026-03-09.md`
- `/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09`

Tracking CSV:
- `/Users/meshulumort/Documents/mekor/reports/old-site-interactivity-migration-matrix-2026-03-10.csv`

## Key Decisions

- All newsletter or email-signup capture from the legacy site should be implemented through the Mailchimp integration on the new site.
- The newsletter archive already exists on the new site, but public signup capture is still missing.
- Core native flows already exist for contact, volunteering, membership applications, donations, event signups, and WhatsApp joins.
- The biggest missing legacy interaction area is kosher listing feedback and local kashrut update submission.

## Highest-Priority Gaps

1. Site-wide newsletter signup
   - Legacy site exposed email capture broadly.
   - New site currently exposes archive links but no public Mailchimp signup surface.

2. Kosher listing correction / update submission
   - Legacy kosher pages invited users to report inaccurate information.
   - New neighborhood pages currently show content only, with no structured submission flow.

3. Davening RSVP / weekday minyan participation
   - Legacy flow relied on explicit RSVP and weekday attendance interest capture.
   - New page preserves wording and WhatsApp/email prompts, but not a structured form flow.

4. Auxiliary membership
   - Legacy flow supported email-based requests plus payment.
   - New page still lacks a structured request form.

## Status Summary

- `Present`: contact forms, volunteer form, membership application flow, donations checkout, events signup system, WhatsApp joins, Israel donation CTA
- `Partial`: visit-us newsletter surface, davening RSVP flow, auxiliary membership, kiddush sponsorship intake, legacy event-specific external RSVP parity, bulletin-board ad hoc workflows
- `Missing`: site-wide Mailchimp signup, about-us inquiry surface, kosher correction/update forms
