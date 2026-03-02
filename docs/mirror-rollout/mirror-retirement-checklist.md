# Mirror Retirement Checklist

Use this checklist route-by-route. Do not remove mirror runtime/path-specific patches until every gate is passed.

## 1) Rollout Wave Setup

- [ ] Route is assigned to a wave in `mirror-data/rollout/route-rollout-tracker.json`.
- [ ] Engineering, QA, and SEO owners are assigned for the route.
- [ ] Native flag env key is defined and reviewed.
- [ ] Rollback plan is confirmed: native flag can be switched off to return to mirror.

## 2) Native Enablement Gate

- [ ] Native flag is enabled for the route.
- [ ] Visual checks pass on target breakpoints.
- [ ] Functional checks pass.
- [ ] SEO checks pass.
- [ ] Monitoring start date (`monitoring.startedOn`) is recorded.

## 3) 7-Day Stability Gate

- [ ] Route has remained native-enabled for at least 7 full days.
- [ ] No blocker regressions were opened during the 7-day window.
- [ ] Final parity spot-check confirms no user-visible regressions.

## 4) Decommission Gate (After Stability)

- [ ] Route-specific mirror-runtime hooks removed.
- [ ] Route-specific `lib/mirror/document-html.ts` path fixes removed.
- [ ] Route-specific `app/globals.css` path overrides removed.
- [ ] Decommission flags marked complete in tracker JSON.

## 5) Final Audit

- [ ] Run `npm run mirror:rollout-audit`.
- [ ] Confirm route shows zero live patch debt (`runtime/doc/css = 0/0/0`).
- [ ] Confirm route status is `retired` in `docs/mirror-rollout/rollout-tracker.md`.
- [ ] Confirm route is no longer listed as blocked in `docs/mirror-rollout/mirror-retirement-completion-report.md`.
