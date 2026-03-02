# Native Route Parity Checklist

## Team 4 (`/team-4`)
- [ ] Page renders native header + volunteer form (no `.mirror-root` wrapper).
- [ ] Required validation blocks submit when first name, last name, email, or opportunity is missing.
- [ ] Email field enforces browser email validation.
- [ ] Submit button disables while request is in flight.
- [ ] Submit sends `POST /api/forms/volunteer` with expected payload fields.
- [ ] Successful `2xx` response resets form and shows “Thanks for submitting!” message.
- [ ] Visual gate: compare spacing/typography/states on desktop and mobile against baseline.

## Rabbi Desk (`/from-the-rabbi-s-desk`)
- [ ] Page renders native podcast list container (no mirror DOM replacement needed).
- [ ] Initial load requests `GET /api/podcast-episodes?limit=60`.
- [ ] Loading state appears before episodes resolve.
- [ ] Search filters by episode title and description.
- [ ] “Load More” reveals 5 additional episodes per click.
- [ ] Empty-search-result state shows “No podcast episodes matched your search.”
- [ ] API failure state shows fallback message and external source link.
- [ ] Visual gate: compare list cards, audio controls, and load-more/search controls on desktop/mobile.

## Kosher Map (`/kosher-map`)
- [ ] Page renders native map container with Elfsight script load.
- [ ] If widget fails or times out, fallback panel appears with legacy iframe + neighborhood links.
- [ ] Native neighborhood quick links route correctly.
- [ ] No mirror document patch dependency required for map embed.
- [ ] Visual gate: verify both widget-success and fallback presentations.

## Team 0 Rollback
- [ ] `TEAM0_NATIVE_TEAM_4=false` routes `/team-4` to mirror fallback.
- [ ] `TEAM0_NATIVE_FROM_THE_RABBI_S_DESK=false` routes `/from-the-rabbi-s-desk` to mirror fallback.
- [ ] `TEAM0_NATIVE_KOSHER_MAP=false` routes `/kosher-map` to mirror fallback.
- [ ] Re-enable by setting each flag to `true` (or unset).
