# Donations Page Redesign — Approved Design

Approved by the site owner in-session on 2026-07-20 (choices: "Modal + inline form", "Full restructure").

## Problems being solved
1. "Popular ways to give" is a static list with no way to act on any option.
2. The donation form's "Secure donation intake" badge is internal-sounding; the flow should be presented in a modal and pre-fill for signed-in users.
3. No persistent donate CTA while scrolling.
4. The page repeats the same external payment links in four places.

## Page structure (top → bottom)
1. **Hero** — existing imagery; actions become primary **"Donate now"** (`href="#donate"`), secondary **"Sponsor a Kiddush"** (`/kiddush`), and a quiet "Other ways to give ↓" (`#other-ways`). The client layer intercepts clicks on `a[href="#donate"]` to open the modal; without JS the anchor scrolls to the inline form.
2. **Popular ways to give** — clickable card grid: Kiddush/Third Meal (links to `/kiddush`), Memorial plaque ($1,000), Siddur/Machzor dedication ($100), Chumash dedication ($200), Community dinner ($1,800 full / $1,000 half), General gift (any amount). Cards (except Kiddush) open the modal pre-configured: designation selected, suggested amount active, card label passed as the Stripe line item via the API's existing `itemName`.
3. **Inline donation form** (`id="donate"`) — `DonationCheckoutForm` stays on the page as fallback and deep-link target.
4. **Dedications & sponsorships** — split panel + the full opportunities list (once).
5. **Legacy giving** — building/space dedications with Speak-with-Leadership CTAs (unchanged).
6. **More ways to give** (`id="other-ways"`) — the single home for Stripe link, Venmo, PayPal Giving Fund, PayPal Checkout, Zelle, and check instructions.
7. **Affiliates** (wine/Judaica) — kept.

Deleted: hero raw payment links, "Donate by Card" promo card, "Quick Donation Links" cluster, the static popular-ways list.

## Donation flow
- New reusable `components/ui/dialog.tsx` (Radix, styled to match `sheet.tsx` conventions).
- `DonateExperience` client component owns: modal state, popular-ways grid, sticky button, `#donate` interception. The same `DonationCheckoutForm` renders inline and in the modal (remounted with a key when opened from a card).
- **Copy**: badge "Secure donation intake" is removed. Form title defaults to **"Make a donation"**; a trust line "Secure checkout via Stripe · Tax receipt when applicable" replaces the badge.
- **Pre-fill**: existing `usePublicProfilePrefill` (name/email/phone from `/api/account/profile` when signed in) is kept and verified; works identically in the modal.
- **New optional field**: "Dedication / in honor of" (`dedicationNote`, max 300 chars) → checkout API schema → Stripe session/payment-intent metadata → payments ledger metadata.
- Three new designations in `lib/payments/shared.ts` with suggested amounts: **Memorial plaque** [$1,000], **Book dedication** [$100, $200], **Community dinner** [$1,800, $1,000]. The API accepts free-string designations, so this is config-only.

## Sticky Donate button
Floating pill ("♥ Donate", existing navy-gradient Button style) fixed **bottom-left** (feedback bubble owns bottom-right). Appears after the hero leaves the viewport (IntersectionObserver sentinel); hidden while the modal is open or while the inline form is on screen.

## Tests
- Update `tests/donation-suggested-amounts.test.ts` for the new designations.
- New `tests/donations-page.test.ts` (source-contract style): popular-ways cards are interactive and pre-configured; "Secure donation intake" appears nowhere; `#donate` anchor + sticky button exist; each external payment link appears exactly once in `app/donations/page.tsx`; checkout route accepts `dedicationNote`.
- Existing `donation-visibility` guarantees (nav CTAs, homepage, light text) must keep passing.
