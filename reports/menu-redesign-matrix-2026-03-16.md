# Menu Redesign Matrix (2026-03-16)

Source basis:
- `lib/navigation/site-menu.ts` (main menu + submenus)
- Archived route mapping embedded in `old-archived-version/127.0.0.1_8081/dl/...url=https%3A%2F%2Fwww.mekorhabracha.org%2F.html`

## High-confidence archive parallels (implement pixel-close native redesign)
| Route | Menu Label | Archive Parallel | Status |
|---|---|---|---|
| `/` | Home | archived homepage | In progress (native rebuilt; visual polish continuing) |
| `/membership` | Join | `./membership` (`db25x`) | Pending |
| `/events` | Events | `./events` (`xzxzq`) | Pending |
| `/about-us` | About Us | `./about-us` (`ktlkb`) | Pending |
| `/our-leadership` | Our Leadership | `./our-leadership` (`ea339`) | Pending |
| `/our-rabbi` | Our Rabbis | `./our-rabbi` (`trsfl`) | Pending |
| `/visit-us` | Visit Us | `./visit-us` (`fpiqj`) | Pending |
| `/contact-us` | Contact Us | `./contact-us` (`r7263`) | Pending |
| `/in-the-news` | In The News | `./in-the-news` (`gl6cg`) + `/news/{title}` | Pending |
| `/our-communities` | Our Community | `./our-communities` (`frpg1`) | Pending |
| `/from-the-rabbi-s-desk` | From The Rabbi's Desk | `./from-the-rabbi-s-desk` (`psnpq`) | Pending |
| `/center-city` | Kosher Guide | `/center-city` + related category routes | Pending |
| `/donations` | Support Mekor | `./donations` (`v0nwv`) | Pending |
| `/kiddush` | Kiddush | `./kiddush` (`k874k`) | Pending |
| `/davening` | Davening | `./davening` (`oqf7h`) | Pending |
| `/auxiliary-membership` | Auxiliary & Alumni Membership | `./auxiliary-membership` (`piaif`) | Pending |
| `/center-city-beit-midrash` | Center City Beit Midrash | `./center-city-beit-midrash` (`f0p0m`) | Pending |
| `/team-4` | Volunteer | `./team-4` (`d2x9l`) | Pending |
| `/mekor-bulletin-board` | Mekor Bulletin Board | `./mekor-bulletin-board` (`daxbp`) | Pending |
| `/israel` | Israel | `./israel` (`fqy6d`) | Pending |
| `/testimonials` | Testimonials | `./testimonials` (`j0stn`) | Pending |
| `/mekorcouples` | Mekor Couples | `./mekorcouples` (`evxtj`) | Pending |
| `/philly-jewish-community` | Philly Jewish Community | `./philly-jewish-community` (`vvzov`) | Pending |

## No direct archive parallel (keep native UX; apply thematic parity only)
| Route | Menu Label | Archive Status | Guidance |
|---|---|---|---|
| `/account` | Member Hub | No direct parallel | Keep app-style dashboard UX; reuse old-site tone/typography where safe |
| `/account/dues` | Dues & payments | No direct parallel | Keep billing UX native; map copy blocks from membership pages only |
| `/members` | Members directory | No direct parallel | Preserve directory functionality; borrow community voice and hierarchy |
| `/community` | Community directory | No direct parallel | Preserve directory functionality; borrow old community framing |
| `/account/profile` | Your profile | No direct parallel | Keep profile editor native; optional visual cues from public profile template |

## Execution order
1. About cluster: `/about-us`, `/our-leadership`, `/our-rabbi`, `/visit-us`, `/contact-us`
2. Community/news cluster: `/in-the-news`, `/from-the-rabbi-s-desk`, `/our-communities`
3. Action cluster: `/donations`, `/kiddush`, `/davening`, `/auxiliary-membership`
4. Program cluster: `/center-city-beit-midrash`, `/team-4`, `/mekor-bulletin-board`, `/israel`, `/testimonials`, `/mekorcouples`, `/philly-jewish-community`
5. High-logic routes last: `/events`, `/center-city` (list/detail behavior parity)
