# Old Site Interactivity Audit

Source of truth: `/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09`

This document lists places on the old site where a user could submit information, sign up, RSVP, donate, or otherwise interact beyond simple reading.

## 1. Global Newsletter Subscription

Observed across a large portion of the old site as a repeated footer module.

Evidence:
- [home export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/001__www-mekorhabracha-org__home/content.md)
- [about us export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/035__www-mekorhabracha-org__about-us/content.md)
- [contact us export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/043__www-mekorhabracha-org__contact-us/content.md)
- [visit us export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/251__www-mekorhabracha-org__visit-us/content.md)

Visible interaction:
- `SUBSCRIBE TO OUR WEEKLY NEWSLETTER`
- `Enter your email here`
- `SUBSCRIBE`
- `Latest Newsletters`

Implementation implication:
- The old site had an email capture flow available site-wide, or very close to site-wide.
- The new site should preserve:
  - newsletter email capture
  - newsletter archive access

## 2. General Contact Form

Confirmed on:
- [contact us export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/043__www-mekorhabracha-org__contact-us/content.md)

Visible fields:
- `First Name`
- `Last Name`
- `Email`
- `Message`
- `Submit`

Implementation implication:
- This was a real user-submittable general inquiry form.
- The new site should preserve the full contact submission flow, not just contact details.

## 3. Visit Us Contact Form

Confirmed on:
- [visit us export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/251__www-mekorhabracha-org__visit-us/content.md)

Visible fields:
- `First Name`
- `Last Name`
- `Email`
- `Message`
- `Submit`

Implementation implication:
- `Visit Us` was also an active intake form, not just informational.
- This is distinct from plain contact info and likely intended for visitors/newcomers.

## 4. About Us Contact Form

Confirmed on:
- [about us export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/035__www-mekorhabracha-org__about-us/content.md)

Visible fields:
- `First Name`
- `Last Name`
- `Email`
- `Message`
- `Submit`

Implementation implication:
- The old `About Us` page also included a contact submission form.
- If you want strict parity, this route should retain a direct inquiry form, not just links.

## 5. Local Kashrut Suggestion / Contact Forms

Confirmed on neighborhood kosher pages:
- [center city export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/038__www-mekorhabracha-org__center-city/content.md)
- [main line export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/103__www-mekorhabracha-org__main-line-manyunk/content.md)
- [old york road export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/144__www-mekorhabracha-org__old-yorkroad-northeast/content.md)
- [cherry hill export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/042__www-mekorhabracha-org__cherry-hill/content.md)

Visible interaction:
- `Get in Touch About Local Kashrut`
- `Have questions, updates, or suggestions regarding our list of kosher-certified establishments?`
- Fields:
  - `First name`
  - `Last name`
  - `Email`
  - `Phone`
  - `Subject`
  - `Question or note`
  - `Submit`

Implementation implication:
- This was a substantive community-updates intake flow for kosher directory maintenance.
- The new kosher guide should preserve a submission channel for corrections, additions, and local updates.

## 6. Volunteer Sign-Up Form

Confirmed on:
- [volunteer export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/248__www-mekorhabracha-org__team-4/content.md)

Visible fields:
- `First Name`
- `Last Name`
- `Email`
- `Phone`
- `Select a date`
- `Opportunities`
- `Choose an option`
- `Submit`

Implementation implication:
- This was a structured volunteer intake form, not only an email CTA.
- The new site should support explicit volunteer submissions with role/date selection.

## 7. Davening Participation Form

Confirmed on:
- [davening export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/046__www-mekorhabracha-org__davening/content.md)

Visible interaction section:
- `Let us know!`
- `Interested in reading Torah or Haftorah, or leading davening? Have an upcoming yahrzeit?`

Visible fields:
- `First Name`
- `Email`
- `Last Name`
- `Phone`
- `Additional Note`
- `Submit`

Implementation implication:
- The old site had a dedicated davening participation intake form.
- This should be preserved separately from general contact.

## 8. Membership Join / Renew Flows

Confirmed on:
- [membership export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/106__www-mekorhabracha-org__membership/content.md)
- [legacy membership old export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/107__www-mekorhabracha-org__membership-old/content.md)

Visible interaction:
- `Join Now!` on membership category cards
- `Use this form`
- `Submit your membership payment directly on this page`
- email fallback paths such as `Email membership@mekorhabracha.org`

Implementation implication:
- Membership had both:
  - application/join flow
  - payment flow
  - email/manual fallback

## 9. Auxiliary / Alumni Membership Sign-Up and Payment

Confirmed on:
- [auxiliary membership export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/036__www-mekorhabracha-org__auxiliary-membership/content.md)

Visible interaction:
- `Get Auxiliary Membership`
- payment online references:
  - `Venmo`
  - `PayPal Giving Fund`
  - `regular PayPal`
- email request flow:
  - `email the shul to request membership`

Implementation implication:
- This route was not passive informational copy.
- It supported both sign-up intent and payment completion.

## 10. Donations and Sponsorship Payments

Confirmed on:
- [donations export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/048__www-mekorhabracha-org__donations/content.md)
- [kiddush export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/074__www-mekorhabracha-org__kiddush/content.md)

Visible interaction:
- donation methods:
  - `Zelle`
  - `Credit / ACH / Apple Pay`
  - `PayPal Giving Fund`
  - `Venmo`
- `Make a Donation`
- sponsorship CTAs such as:
  - `Sponsor via PayPal`
  - `Sponsor the Kiddush`
  - `Celebrate a Birthday Kiddush`
  - `Sponsor the Third Meal`
  - `Sponsor the Bagel Brunch Kiddush`

Implementation implication:
- Donation and sponsorship routes were active transaction entry points.
- These should be documented as core conversion flows.

## 11. Event RSVPs and Event Detail CTAs

Confirmed on:
- [events export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/049__www-mekorhabracha-org__events/content.md)

Visible interaction:
- event cards showed `More info`
- many cards showed `RSVP`
- others showed `Details`

Implementation implication:
- The events hub was not just calendar display.
- It functioned as an entry point into event-specific registration or RSVP flows.

## 12. Event-Specific External RSVP Forms

Confirmed examples:
- [Mekor's Tot Shabbat export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/062__www-mekorhabracha-org__events-1__mekors-tot-shabbat/content.md)
- [Scholar in Residence Shabbat export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/065__www-mekorhabracha-org__events-1__scholar-in-residence-shabbat-with-rabbi-aaron-goldscheider/content.md)
- [Shabbat Shuva Dinner Kumzitz export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/067__www-mekorhabracha-org__events-1__shabbat-shuva-dinner-kumzitz/content.md)
- [Pesach Seders export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/058__www-mekorhabracha-org__events-1__mekor-pesach-seders/content.md)

Visible interaction:
- explicit `RSVP here:` links
- Google Forms URLs in event body copy
- explicit RSVP-required language such as `RSVP Required for all meals`

Implementation implication:
- Some old event flows used external Google Forms rather than on-site registration.
- These cases should be audited individually before migration so no registration workflow is lost.

## 13. WhatsApp Join Flows

Confirmed on:
- [visit us export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/251__www-mekorhabracha-org__visit-us/content.md)
- [contact us export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/043__www-mekorhabracha-org__contact-us/content.md)
- [events export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/049__www-mekorhabracha-org__events/content.md)

Visible interaction:
- `Mekor Community Whatsapp Group`
- join language for:
  - community groups
  - daily minyan group
  - social events / meal matching / general chats / minyan updates

Implementation implication:
- WhatsApp join links were a meaningful onboarding and engagement surface on the old site.

## 14. Latest Newsletter Archive Links

Observed repeatedly alongside subscription UI.

Implementation implication:
- The old site exposed both:
  - newsletter signup
  - newsletter archive browsing

This archive behavior should remain available on the new site even if the form provider changes.

## 15. Israel Page Donation CTA

Confirmed on:
- [israel export](/Users/meshulumort/Documents/mekor/output/mekorhabracha-site-export-2026-03-09/073__www-mekorhabracha-org__israel/content.md)

Visible interaction:
- `Donate Now`
- outbound campaign/support links

Implementation implication:
- This page had at least one active donation/support conversion path.

## Summary Checklist

High-confidence old-site interactive features that should be represented on the new site:

- Global newsletter subscribe form
- Newsletter archive access
- General contact form
- Visit-us/newcomer inquiry form
- About-us inquiry form
- Kosher directory correction / suggestion forms
- Volunteer signup form
- Davening participation / yahrzeit / leining form
- Membership application and payment flow
- Auxiliary membership request and payment flow
- Donation flow
- Kiddush / sponsorship payment flows
- Events hub with RSVP/detail CTAs
- Event-specific RSVP forms, including external Google Forms cases
- WhatsApp join links for community/minyan engagement
- Israel-page donation/support CTA

## Important Limitation

This export captures visible copy and reachable links. It does not guarantee backend provider details for every old Wix form.

Inference:
- The existence of visible fields plus `Submit` is strong evidence of a real submission flow.
- For exact destination behavior, provider/webhook/email-recipient details would need either old Wix admin access or frontend source/network traces from the original site environment.
