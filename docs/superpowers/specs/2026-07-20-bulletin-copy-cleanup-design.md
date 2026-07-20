# Bulletin Board Copy Cleanup — Approved Design

Approved by the site owner in-session on 2026-07-20. Problem: shell copy on `/mekor-bulletin-board` (plus the homepage teaser and weekly newsletter template) describes internal content strategy ("so the homepage and weekly newsletter stay focused", "Living Flyer Board", "One board for repeating community info") instead of speaking to community members. Card content is fine and untouched.

## Exact copy changes

`app/mekor-bulletin-board/page.tsx`:
1. Hero eyebrow: `Community hub · Living flyer board` → `Flyers · Programs · Notices`.
2. Hero lead → `Classes, campaigns, volunteer opportunities, and neighborly offers — posted in one place and kept up to date.`
3. **Delete the intro section entirely** ("About this board": eyebrow "From the weekly newsletter", h2 "One board for repeating community info", body paragraph, and the two banner thumbnails) plus its now-unused CSS.
4. "Featured Now" desc → `This season's campaigns and classes, happening right now.`
5. "Standing Community Info" h2 → **`Community Essentials`**; desc → `The programs, contacts, and resources you'll come back to all year.` (eyebrow "Keep handy" stays).

`app/mekor-bulletin-board/content.ts`:
6. `BOARD_NAV` label `Standing info` → `Essentials` (href unchanged).

`app/page.tsx` (homepage teaser):
7. Paragraph → `Tot Shabbat, Hebrew Help, membership, Eruv support, classes, and neighborly offers — every standing notice, one click away.` ("View the Bulletin Board" link unchanged; a test pins it.)

`lib/newsletter/weekly-cleaned.ts`:
8. `Standing community info now lives on Mekor's <strong>Living Flyer Board</strong> so this weekly email stays focused on this Shabbat:` → `Ongoing programs and community resources are always on the <strong>Mekor Bulletin Board</strong>:` (list and "Open the Bulletin Board" button unchanged). Affects future drafts from the starter only.

Unchanged: all bulletin cards, "Community Updates" desc, Classifieds/Support/Quick Contacts sections, visual design.

## Tests
- `tests/weekly-cleaned-newsletter.test.ts`: replace the `/Living Flyer Board/` assertion with the new phrase.
- New `tests/bulletin-board-copy.test.ts`: page/homepage/newsletter sources contain none of the internal phrases ("Living Flyer Board" outside history, "One board for repeating", "stay focused"/"stays focused" rationale copy); page contains "Community Essentials".

## Noted, out of scope
The newsletter starter's gray editor-placeholder paragraphs ("Add or remove sponsor notes here…") would read oddly if a draft ships unedited — separate future task.
