# Mirror Rollout Tracker

Generated on 2026-03-02. Stability window: 7 days.

## Rollout Waves and Ownership Calendar

| Wave | Date Range | Engineering Owner | QA Owner | SEO Owner | Routes |
| --- | --- | --- | --- | --- | --- |
| W1 | 2026-03-02 -> 2026-03-15 | web-platform | qa-web | seo-web | /events, /in-the-news |
| W2 | 2026-03-16 -> 2026-03-29 | web-platform | qa-web | seo-web | /center-city, /main-line-manyunk, /old-yorkroad-northeast, /cherry-hill |
| W3 | 2026-03-30 -> 2026-04-12 | web-platform | qa-web | seo-web | /team-4, /from-the-rabbi-s-desk |
| W4 | 2026-04-13 -> 2026-04-26 | web-platform | qa-web | seo-web | /donations, /kosher-map |

## Route Status

| Route | Wave | Native Flag | Checks | Stability Window | Live Patch Debt (runtime/doc/css) | Decommission Checklist | Status | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /events | W1 | on (NEXT_PUBLIC_NATIVE_ROUTE_EVENTS, implemented) | v:pending / f:pending / seo:pending | not-started | 0/2/3 | runtime:no, doc:no, css:no | monitoring-checks-pending | visual/functional/seo checks are incomplete; 7-day stability window has not elapsed; decommission checklist is incomplete; route-specific patch debt remains |
| /in-the-news | W1 | on (NEXT_PUBLIC_NATIVE_ROUTE_IN_THE_NEWS, implemented) | v:pending / f:pending / seo:pending | not-started | 0/0/2 | runtime:no, doc:no, css:no | monitoring-checks-pending | visual/functional/seo checks are incomplete; 7-day stability window has not elapsed; decommission checklist is incomplete; route-specific patch debt remains |
| /center-city | W2 | on (NEXT_PUBLIC_NATIVE_ROUTE_CENTER_CITY, implemented) | v:pending / f:pending / seo:pending | not-started | 1/1/2 | runtime:no, doc:no, css:no | monitoring-checks-pending | visual/functional/seo checks are incomplete; 7-day stability window has not elapsed; decommission checklist is incomplete; route-specific patch debt remains |
| /main-line-manyunk | W2 | on (NEXT_PUBLIC_NATIVE_ROUTE_MAIN_LINE_MANYUNK, implemented) | v:pending / f:pending / seo:pending | not-started | 1/0/2 | runtime:no, doc:no, css:no | monitoring-checks-pending | visual/functional/seo checks are incomplete; 7-day stability window has not elapsed; decommission checklist is incomplete; route-specific patch debt remains |
| /old-yorkroad-northeast | W2 | on (NEXT_PUBLIC_NATIVE_ROUTE_OLD_YORKROAD_NORTHEAST, implemented) | v:pending / f:pending / seo:pending | not-started | 1/0/2 | runtime:no, doc:no, css:no | monitoring-checks-pending | visual/functional/seo checks are incomplete; 7-day stability window has not elapsed; decommission checklist is incomplete; route-specific patch debt remains |
| /cherry-hill | W2 | on (NEXT_PUBLIC_NATIVE_ROUTE_CHERRY_HILL, implemented) | v:pending / f:pending / seo:pending | not-started | 1/0/2 | runtime:no, doc:no, css:no | monitoring-checks-pending | visual/functional/seo checks are incomplete; 7-day stability window has not elapsed; decommission checklist is incomplete; route-specific patch debt remains |
| /team-4 | W3 | off (NEXT_PUBLIC_NATIVE_ROUTE_TEAM_4, not-implemented) | v:pending / f:pending / seo:pending | not-started | 1/1/10 | runtime:no, doc:no, css:no | pending-native-enable | native flag is off; visual/functional/seo checks are incomplete; 7-day stability window has not elapsed; decommission checklist is incomplete; route-specific patch debt remains |
| /from-the-rabbi-s-desk | W3 | off (NEXT_PUBLIC_NATIVE_ROUTE_FROM_THE_RABBI_S_DESK, not-implemented) | v:pending / f:pending / seo:pending | not-started | 1/0/1 | runtime:no, doc:no, css:no | pending-native-enable | native flag is off; visual/functional/seo checks are incomplete; 7-day stability window has not elapsed; decommission checklist is incomplete; route-specific patch debt remains |
| /donations | W4 | off (NEXT_PUBLIC_NATIVE_ROUTE_DONATIONS, not-implemented) | v:pending / f:pending / seo:pending | not-started | 0/1/3 | runtime:no, doc:no, css:no | pending-native-enable | native flag is off; visual/functional/seo checks are incomplete; 7-day stability window has not elapsed; decommission checklist is incomplete; route-specific patch debt remains |
| /kosher-map | W4 | off (NEXT_PUBLIC_NATIVE_ROUTE_KOSHER_MAP, not-implemented) | v:pending / f:pending / seo:pending | not-started | 1/0/4 | runtime:no, doc:no, css:no | pending-native-enable | native flag is off; visual/functional/seo checks are incomplete; 7-day stability window has not elapsed; decommission checklist is incomplete; route-specific patch debt remains |

## Check Commands

- visual: `AUDIT_BASE_URL=<preview-or-prod-url> node scripts/_responsive_audit.mjs`
- functional: `npm test`
- seo: `npm run mirror:verify`

Audit source: `mirror-data/rollout/route-rollout-tracker.json`
