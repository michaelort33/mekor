# Team 4 Medium Static/Marketing Migration Tracker

Last updated: 2026-03-02

## Archetype Map

| Archetype | Description | Routes |
|---|---|---|
| `info` | Hero + editorial sections (narrative content, schedules, resources) | `/donations`, `/our-communities`, `/davening`, `/center-city-beit-midrash`, `/copy-of-center-city-beit-midrash`, `/philly-jewish-community` |
| `contact` | Contact detail hub + native contact form | `/visit-us`, `/contact-us` |
| `directory` | Board/list pages (announcements, testimonials, listings) | `/mekor-bulletin-board`, `/testimonials`, `/general-5`, `/old-kosher-restaurants` |

## Route Migration Status (Initial Wave)

| Route | Archetype | Native Route File | Metadata Parity | Mirror Runtime Dependency | Route-specific CSS Override | Visual/Smoke |
|---|---|---|---|---|---|---|
| `/donations` | `info` | `app/donations/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/visit-us` | `contact` | `app/visit-us/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/contact-us` | `contact` | `app/contact-us/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/our-communities` | `info` | `app/our-communities/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/davening` | `info` | `app/davening/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/mekor-bulletin-board` | `directory` | `app/mekor-bulletin-board/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/center-city-beit-midrash` | `info` | `app/center-city-beit-midrash/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/copy-of-center-city-beit-midrash` | `info` | `app/copy-of-center-city-beit-midrash/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/philly-jewish-community` | `info` | `app/philly-jewish-community/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/testimonials` | `directory` | `app/testimonials/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/general-5` | `directory` | `app/general-5/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |
| `/old-kosher-restaurants` | `directory` | `app/old-kosher-restaurants/page.tsx` | Preserved via mirror metadata helper | Removed | Removed | Pending run |

## Implementation Notes

- Native template system added under `components/medium-pages/` and `lib/medium-pages/content.ts`.
- Catch-all native path exclusions updated in `app/[...slug]/page.tsx` for this wave.
- Route-specific mirror CSS selectors for this wave were removed from `app/globals.css`.
