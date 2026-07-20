# Site Accessibility Contrast Crawl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crawl the live local site for hard-to-read text (especially dark-on-dark / light-on-light), capture screenshot evidence, fix contrast failures to WCAG AA, and leave a reusable Playwright audit plus regression tests so this class of bug stops recurring.

**Architecture:** Add a Playwright-based contrast crawler under `scripts/review/` that visits curated public routes (plus key interactive chrome states), computes WCAG contrast from rendered styles, and writes JSON/Markdown/screenshot artifacts. Triage findings, prefer cascade-root / shared-component fixes over one-off `!important` patches, expand `tests/link-contrast-cascade.test.ts`, re-crawl to verify, then open a PR.

**Tech Stack:** Next.js 16 App Router, Playwright (already in `devDependencies`), Node `tsx` scripts, existing `node:test` contract tests, CSS modules + Tailwind/shadcn Button.

## Global Constraints

- Work in an isolated git worktree under `.worktrees/` (already gitignored); no native EnterWorktree tool → use `git worktree add`.
- Do **not** introduce or expand mirror-page rendering (`agents.md` / `McCarr.md`).
- Contrast target: **WCAG 2.2 AA** — normal text ≥ 4.5:1, large text (≥18pt / ≥14pt bold) ≥ 3:1.
- Scope (default): **public marketing + auth pages + shared chrome** (nav, footer, feedback launcher). Skip `/admin/*` and authenticated `/account/*` unless the crawl surfaces shared components that also affect public UI.
- Ignore false positives from: Google Maps / third-party iframes, `opacity: 0` / `visibility: hidden` / offscreen decorative nodes, 1×1 pixels, empty text.
- Prefer fixing at the cascade root or shared components (`app/globals.css`, `components/ui/button.tsx`, marketing primitives, nav CTAs) before page-local `!important`.
- Before every push: `npm run prepush:deploy-check`.
- Visual QA: desktop `1440`/`1280` and mobile `390` screenshots for changed sections; store under `/opt/cursor/artifacts/` for the walkthrough.
- Also copy this plan into `docs/superpowers/plans/2026-07-20-site-contrast-crawl.md` during Task 0 (writing-plans convention).
- Node 22 per `.nvmrc`.

## Background (why this exists)

Dark-on-dark CTAs have already been patched multiple times (#59 Donate, #63 Area switcher, #65 `@layer base` for `a { color: inherit }`). Static CSS contracts in `tests/link-contrast-cascade.test.ts` catch known selectors, but **nothing measures computed contrast across the real rendered site**. The user wants a crawl with screenshots, not another single-button hotfix.

## File map

| Path | Role |
|---|---|
| `scripts/review/contrast-crawl.ts` | **Create** — Playwright crawler CLI |
| `scripts/review/contrast-lib.ts` | **Create** — color parse, luminance, effective background, thresholds |
| `scripts/review/contrast-routes.ts` | **Create** — curated public route + interaction matrix |
| `package.json` | **Modify** — add `"review:contrast": "node node_modules/tsx/dist/cli.mjs scripts/review/contrast-crawl.ts"` |
| `tests/link-contrast-cascade.test.ts` | **Modify** — extend with any newly fixed selectors / shared rules |
| `tests/contrast-crawl-smoke.test.ts` | **Create** — unit tests for `contrast-lib` (no browser); optional tiny fixture |
| `app/globals.css`, `components/ui/button.tsx`, nav/marketing/page CSS modules | **Modify as findings dictate** |
| `output/review/contrast-*` | Runtime artifacts (gitignored via `output/`) |
| `docs/superpowers/plans/2026-07-20-site-contrast-crawl.md` | **Create** — copy of this plan |

---

### Task 0: Isolated worktree + baseline

**Files:**
- Create: `.worktrees/site-a11y-contrast-crawl/` (git worktree)
- Create: `docs/superpowers/plans/2026-07-20-site-contrast-crawl.md` (plan copy)

- [ ] **Step 0.1:** Confirm still not in a linked worktree (`GIT_DIR == GIT_COMMON`) and `.worktrees` is ignored (`git check-ignore -q .worktrees`).
- [ ] **Step 0.2:** Create worktree from current HEAD on a new branch:

```bash
git worktree add .worktrees/site-a11y-contrast-crawl -b cursor/site-a11y-contrast-crawl
cd .worktrees/site-a11y-contrast-crawl
```

If sandbox/permission blocks worktree creation: report and continue in `/workspace` on the existing branch.
- [ ] **Step 0.3:** Wait for async install if needed; `npm install` if `node_modules` missing in worktree.
- [ ] **Step 0.4:** Run baseline `npm test`. If failures: stop and ask whether to proceed.
- [ ] **Step 0.5:** Copy approved plan into `docs/superpowers/plans/2026-07-20-site-contrast-crawl.md` and commit: `Add site contrast crawl implementation plan`.

**Acceptance:** Worktree ready; baseline tests green (or user waiver recorded); plan checked into docs.

---

### Task 1: Contrast library + unit tests (TDD)

**Files:**
- Create: `scripts/review/contrast-lib.ts`
- Create: `tests/contrast-crawl-smoke.test.ts`

**Interfaces (produced):**
- `parseCssColor(input: string): { r: number; g: number; b: number; a: number } | null` — supports `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`/`hsla()` as returned by Chromium when practical; reject `oklch(...)` by resolving via canvas in the browser side instead.
- `relativeLuminance(rgb): number` — sRGB WCAG formula.
- `contrastRatio(fg, bg): number` — `(L1 + 0.05) / (L2 + 0.05)`.
- `isLargeText(fontSizePx, fontWeight): boolean` — ≥24px or (≥18.66px and weight ≥700).
- `meetsWcagAa(ratio, large): boolean`.
- `classifyFailure(ratio, large): "fail-aa" | "pass"`.

- [ ] **Step 1.1:** Write failing unit tests for known pairs:
  - `#214e79` on `#214e79` → fail (~1:1)
  - `#f8fbff` on `#214e79` → pass AA
  - `#1d2c3f` on `#f8f3eb` → pass AA
  - white on white → fail
  - large muted text edge cases near 3:1
- [ ] **Step 1.2:** Implement `contrast-lib.ts` until tests pass.
- [ ] **Step 1.3:** Commit: `Add WCAG contrast helpers with unit tests`.

**Acceptance:** `node node_modules/tsx/dist/cli.mjs --test tests/contrast-crawl-smoke.test.ts` passes.

---

### Task 2: Route matrix + crawler script

**Files:**
- Create: `scripts/review/contrast-routes.ts`
- Create: `scripts/review/contrast-crawl.ts`
- Modify: `package.json` scripts

**Route seed (extend `scripts/audit-overflow-sweep.mjs` ROUTES):**
`/`, `/about-us`, `/our-rabbis`, `/our-leadership`, `/our-communities`, `/philly-jewish-community`, `/davening`, `/visit-us`, `/contact-us`, `/donations`, `/membership`, `/membership/apply`, `/auxiliary-membership`, `/login`, `/signup`, `/forgot-password`, `/search`, `/events`, `/kiddush`, `/from-the-rabbi-s-desk`, `/in-the-news`, `/israel`, `/mekor-bulletin-board`, `/mekorcouples`, `/testimonials`, `/community`, `/center-city`, `/cherry-hill`, `/main-line-manyunk`, `/old-yorkroad-northeast`, `/kosher-map`, `/ask-mekor`, `/newsletters`, plus one sample dynamic page if discoverable without DB (skip soft-404s).

**Breakpoints:** `{ name: "mobile", width: 390, height: 844 }`, `{ name: "desktop", width: 1440, height: 900 }`.

**Interactive states (at least on `/`):**
1. Default page load
2. Mobile: open hamburger / mobile drawer (Donate + Sponsor links visible)
3. Desktop: open Give/Donate chevron menu if present
4. Open site feedback sheet (`Share an idea` / feedback launcher) if present

**Crawler algorithm (in page.evaluate + Node orchestration):**
1. Collect candidate elements: `a, button, [role=button], input, label, h1–h6, p, li, span, td, th` that have non-empty trimmed text, are visible (`getClientRects`, not `aria-hidden`, opacity > 0).
2. For each, read `getComputedStyle` color, font-size, font-weight.
3. Resolve effective background by walking ancestors until alpha ≥ 0.98 (or blend translucent layers onto `#ffffff` / body bg). Prefer `backgroundColor`; if transparent, continue. For gradient-only backgrounds where `backgroundColor` is transparent, mark as `needs-screenshot-review` rather than guessing wrong (do not silently ignore dark gradient CTAs — use element screenshot average luminance as fallback when `background-image` contains `gradient` and bg color is transparent).
4. Compute ratio; if below AA, record `{ route, state, breakpoint, selector/xpath, textSnippet, fg, bg, ratio, large }`.
5. Deduplicate near-identical issues (same route+text+fg+bg).
6. For each unique failure (cap ~40 screenshots): element screenshot + full-page screenshot into `output/review/contrast-screenshots/`.
7. Write `output/review/contrast-crawl-latest.json` + `output/review/contrast-crawl-latest.md` summarizing counts by severity/route.

**Env knobs (mirror site-quality-audit):**
- `CONTRAST_CRAWL_BASE_URL` default `http://127.0.0.1:3000`
- `CONTRAST_CRAWL_OUT_DIR` default `output/review`
- `CONTRAST_CRAWL_CONCURRENCY` default `2` (serial page contexts preferred for interaction states)

- [ ] **Step 2.1:** Implement `contrast-routes.ts` exporting `PUBLIC_CONTRAST_ROUTES` and `INTERACTIVE_STATES`.
- [ ] **Step 2.2:** Implement `contrast-crawl.ts` CLI; exit code `0` always for inventory mode, or `1` when `CONTRAST_CRAWL_FAIL_ON_AA=1` (use fail-on for final verification).
- [ ] **Step 2.3:** Add npm script `review:contrast`.
- [ ] **Step 2.4:** Commit: `Add Playwright WCAG contrast crawl script`.

**Acceptance:** Script runs against a running dev server and produces JSON/MD even if findings exist.

---

### Task 3: First crawl + inventory (discover the user’s “dark on dark”)

**Files:** none in repo (artifacts only), except optional checked-in summary under `docs/` only if useful — prefer `/opt/cursor/artifacts/` for human review.

- [ ] **Step 3.1:** Start `npm run dev` in background; wait until `http://127.0.0.1:3000` responds.
- [ ] **Step 3.2:** Run `npm run review:contrast`.
- [ ] **Step 3.3:** Copy key failure screenshots into `/opt/cursor/artifacts/contrast-crawl/` with descriptive names.
- [ ] **Step 3.4:** Produce a triage table in the scratchpad: P0 (illegible CTAs/nav), P1 (body/muted on dark panels), P2 (borderline ~4.0–4.5), ignore list (iframes/false positives).
- [ ] **Step 3.5:** Manually confirm the originally noticed dark-text-on-dark-bg issue appears in the inventory (or file a crawler gap if it does not — e.g. gradient sampling).

**Acceptance:** Inventory exists with screenshots; P0 list is actionable.

---

### Task 4: Fix P0/P1 contrast failures

**Files:** determined by crawl — expected candidates:
- `app/globals.css` (cascade rules for anchors / button links)
- `components/ui/button.tsx`
- `components/navigation/nav-cta.tsx`, `mobile-drawer.tsx`, `area-switcher.module.css`
- `components/marketing/primitives.module.css` / `primitives.tsx`
- `app/page.module.css` and other page modules with dark bands
- Any component the inventory names

**Fix order:**
1. Shared Button / link-as-button text colors (visited/hover included).
2. Dark panel child links that still inherit wrong colors.
3. Page-specific leftovers.

- [ ] **Step 4.1:** For each P0, write/extend a failing contract assertion in `tests/link-contrast-cascade.test.ts` (or a focused new test) **before** editing CSS when the fix is selector-stable.
- [ ] **Step 4.2:** Apply minimal style/markup fixes; avoid mirror paths.
- [ ] **Step 4.3:** Run targeted tests + re-screenshot the fixed controls at 1440 and 390.
- [ ] **Step 4.4:** Commit in logical chunks (e.g. `Fix nav/drawer CTA contrast`, `Fix marketing dark-card link contrast`).

**Acceptance:** All P0 and P1 inventory items resolved or explicitly waived with reason; before/after screenshots saved to artifacts.

---

### Task 5: Regression hardening + final verification

**Files:**
- Modify: `tests/link-contrast-cascade.test.ts` (complete coverage for fixed surfaces)
- Modify: `scripts/review/contrast-crawl.ts` if needed (`FAIL_ON_AA` path)

- [ ] **Step 5.1:** Re-run `npm run review:contrast` with `CONTRAST_CRAWL_FAIL_ON_AA=1` on the public route set (optionally a reduced “smoke” route list for CI-friendly duration — document both).
- [ ] **Step 5.2:** Run full `npm test`.
- [ ] **Step 5.3:** Run `npm run prepush:deploy-check`.
- [ ] **Step 5.4:** Update README with a short “Contrast crawl” subsection: how to run `npm run review:contrast`, where reports land.
- [ ] **Step 5.5:** Commit: `Document contrast crawl and harden AA regression coverage`.
- [ ] **Step 5.6:** Push (after prepush gate) and open/update draft PR summarizing crawl method, top findings, fixes, and embedding before/after screenshots.

**Acceptance:**
- Crawler is reusable via npm script.
- AA failures on crawled public routes are cleared (or listed as known third-party ignores in the report).
- Tests + prepush deploy check pass.
- PR includes evidence.

---

## Testing strategy

| Layer | What | Command |
|---|---|---|
| Unit | Color/luminance/ratio helpers | `node node_modules/tsx/dist/cli.mjs --test tests/contrast-crawl-smoke.test.ts` |
| Contract | Known CTA CSS still declares light/dark text correctly | `… --test tests/link-contrast-cascade.test.ts` |
| Runtime crawl | Computed AA contrast across routes + interactive states | `npm run dev` + `npm run review:contrast` |
| Visual | Screenshots of failing then fixed controls | Playwright element/full-page captures → `/opt/cursor/artifacts/` |
| Gate | Lint/tests/build | `npm run prepush:deploy-check` |

## Out of scope (unless crawl proves otherwise)

- Full WCAG audit beyond contrast (focus order, alt text, ARIA) — existing `dialog-accessibility.test.ts` / site-quality-audit cover pieces of that.
- Admin/member authenticated surfaces (can be a follow-up with `LOCAL_ADMIN_AUTOLOGIN_EMAIL`).
- Redesigning brand colors wholesale — only adjust text/background pairings that fail AA.
- Mirror CSS under `public/mirror-styles/` (legacy; do not “fix” by editing Wix bundles).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Gradient/image backgrounds fool `backgroundColor` sampling | Fallback: element screenshot average luminance; flag for human review |
| Crawl flaky on dynamic/DB routes | Skip soft-404 / empty states; prefer static public pages |
| Over-fixing with `!important` | Prefer `@layer` / Button variants / explicit link classes; keep !important only where cascade war requires it (homepage Support CTAs precedent) |
| Long crawl time | Concurrency 1–2; cache stylesheet; optional `CONTRAST_CRAWL_ROUTES` env filter during iteration |

## Default answers (unless you override)

1. **Scope:** Public site + shared chrome interactive states first.
2. **Threshold:** WCAG AA.
3. **Fix policy:** Fix all real AA failures found in that scope; leave a markdown inventory of waivers.
