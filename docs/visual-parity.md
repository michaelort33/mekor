# Visual Parity Gate

This repo uses a visual parity gate to block native-route enablement when route-level screenshots drift from mirror baseline by more than `2%` at any required breakpoint.

## Breakpoints

- `mobile`: `390x844`
- `tablet`: `768x1024`
- `desktop`: `1366x900`

## Route Scope

Routes are sourced from `lib/native-routes.ts`.

## Commands

1. Capture mirror screenshots into proposed baseline:

```bash
VISUAL_PARITY_MIRROR_BASE_URL=https://www.mekorhabracha.org npm run visual:baseline:capture
```

Optional timeout override for slow pages:

```bash
VISUAL_PARITY_NAV_TIMEOUT_MS=180000
```

2. Approve proposed baseline into tracked baseline (explicit + auditable):

```bash
VISUAL_PARITY_APPROVAL_NOTE="Approved by migration owner after review" npm run visual:baseline:approve
```

3. Capture native candidate screenshots:

```bash
VISUAL_PARITY_NATIVE_BASE_URL=http://127.0.0.1:3000 npm run visual:candidate:capture
```

4. Compare candidate against baseline and fail on breach:

```bash
VISUAL_PARITY_THRESHOLD_PERCENT=2 npm run visual:parity:report
```

## How To Read The Parity Report

Report output defaults to `output/visual-parity/report/` (or `/Users/meshulumort/Documents/mekor/output/visual-parity/report/` when that local output root exists).

- `summary.md`: human-readable table by `route x breakpoint`
- `summary.json`: machine-readable metrics and changed-region coordinates
- `diff/<route-key>/<breakpoint>.png`: raw diff mask
- `changed-regions/<route-key>/<breakpoint>.png`: candidate screenshot with red boxes over changed regions

Interpretation:

- `PASS`: `diffPercent <= 2`
- `FAIL`: `diffPercent > 2`
- A single `FAIL` blocks CI.
- CI uploads `visual-parity-report-<run_id>` artifacts for pull requests.

## Baseline Update Workflow (GitHub Actions)

Use workflow **Visual Parity Baseline Refresh** (`workflow_dispatch`) to:

1. capture mirror baseline screenshots,
2. approve baseline with a required approval note,
3. open an audit PR containing updated baseline assets and approval log.

That workflow is the explicit baseline refresh path.
