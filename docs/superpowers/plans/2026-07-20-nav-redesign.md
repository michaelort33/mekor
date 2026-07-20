# Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved "Menu organization and prioritization" handoff: 6-item public nav (Davening · Events · Membership · Kosher Guide · Who We Are · Community), Donate split-button with give menu, WhatsApp promoted to a first-class pill, quick-tile mobile drawer with single-open accordions, and members-only links moved behind auth.

**Architecture:** Port the handoff bundle's four files (`site-menu.ts`, `desktop-nav.tsx`, `mobile-drawer.tsx`, `nav-cta.tsx`) into the repo, merging in repo-specific behavior the handoff was written without (desktop hover-open + focus management, `KIDDUSH_LINK` export consumed by `app/kiddush/page.tsx`). Integrate via two small `site-navigation.tsx` edits and a `hideTrigger` prop on `UniversalSearch` (its dialog + ⌘K listener only exist while mounted). Update the six source-contract tests that pin the old IA to assert the new IA's equivalent guarantees.

**Tech Stack:** Next.js App Router, Tailwind (arbitrary values + CSS vars), shadcn-style `components/ui`, lucide-react, node:test via `npm test`.

**Handoff bundle (design source of truth):** `/private/tmp/claude-501/-Users-meshulumort-Documents-personal-mekor--claude-worktrees-brave-davinci-ea1eca/1aeac036-12f4-4b68-b164-6984135fd356/scratchpad/menu-redesign/design_handoff_nav_redesign/`

## Global Constraints

- Fidelity is **high**: colors, spacing, radii, and copy in the handoff are final ("Recreate exactly; where a value conflicts with an existing design token, prefer the token if it's visually identical").
- Desktop breakpoint for full nav is `min-[1441px]`; everything below uses the drawer.
- New literal tokens: WhatsApp green set bg `#e7f2e9` / border `#c4dcc9` / border-hover `#8fbf9e` / text `#1e5c3d` / subtext `#4d7a5e` / dot `#2e9e5b`; give secondary navy `#1c4368` bg + `#cfe0ef` text; highlight card bg `#f2f6fa` border `#d9e4ee`; existing navy gradient `#2f6fa8→#214e79`.
- `JOIN_US_LINK.label` = "Join WhatsApp"; `SUPPORT_MEKOR_LINK.label` = "Donate". `SUPPORT_MEKOR_LINK.href` must stay `/donations` (donation-visibility test contract).
- `KIDDUSH_LINK` export must survive (imported by `app/kiddush/page.tsx`); the handoff dropped it because it predates PR #66.
- `Community.href` stays the `/community-life` placeholder with `triggerOnly: true` (never rendered as a link — route intentionally absent).
- Keep the standalone mobile-width Donate `<Button>` in the header (handoff says "optional to keep"; keeping preserves the donation-visibility test's one-tap-donate guarantee). Remove the interim mobile-width "Kiddush" button (superseded by the give card/split-button).
- All tap targets ≥44px in the drawer; preserve `aria-current`, `aria-expanded`/`aria-controls` behavior.
- `nav-brand.tsx`, `components/ui/sheet.tsx`: no changes.
- Commit style: imperative sentence, no prefix (matches `git log`), with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` trailer.

---

### Task 1: New menu data model (`site-menu.ts`) + data-contract tests

**Files:**
- Modify: `lib/navigation/site-menu.ts` (full replacement)
- Test: `tests/kiddush-navigation.test.ts`, `tests/newsletter-navigation.test.ts`, `tests/ask-mekor.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 3–7): `NavLink` (+`note?`, `tone?`), `NavColumn {title, highlight?, links}`, `NavGroup` (+`columns?`, `triggerOnly?`), `NavItem`, `isNavGroup`, `JOIN_US_LINK`, `SUPPORT_MEKOR_LINK`, `KIDDUSH_LINK`, `GIVE_MENU: NavLink[]`, `MEMBERS_MENU: NavLink[]`, `QUICK_TILES: NavLink[]`, `SITE_MENU: NavItem[]` (6 items), `MOBILE_GROUPS: NavGroup[]` (Membership, Who We Are, Community).

- [ ] **Step 1: Rewrite the three data-contract tests to assert the new IA**

`tests/kiddush-navigation.test.ts` — replace entire file:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { GIVE_MENU, KIDDUSH_LINK, SITE_MENU, isNavGroup } from "../lib/navigation/site-menu";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("kiddush sponsorship is a first-class give menu entry", () => {
  const kiddushItem = GIVE_MENU.find((link) => link.href === KIDDUSH_LINK.href);

  assert.ok(kiddushItem);
  assert.equal(kiddushItem?.label, "Sponsor a Kiddush");
  assert.equal(kiddushItem?.note, "Celebrate a simcha with the community");
});

test("kiddush is not buried inside any public nav group", () => {
  for (const item of SITE_MENU) {
    assert.notEqual(item.href, KIDDUSH_LINK.href);
    if (isNavGroup(item)) {
      assert.equal(
        item.children.some((child) => child.href === KIDDUSH_LINK.href),
        false,
      );
    }
  }
});

test("desktop give menu and mobile drawer surface sponsor a kiddush", async () => {
  const [navCtaSource, drawerSource, pageSource] = await Promise.all([
    readTextFile("components/navigation/nav-cta.tsx"),
    readTextFile("components/navigation/mobile-drawer.tsx"),
    readTextFile("app/kiddush/page.tsx"),
  ]);

  assert.match(navCtaSource, /GIVE_MENU/);
  assert.match(drawerSource, /Sponsor a Kiddush — celebrate a simcha/);
  assert.match(pageSource, /Choose a sponsorship/);
  assert.match(pageSource, /#kiddush-payment/);
});
```

`tests/newsletter-navigation.test.ts` — replace entire file:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { SITE_MENU, isNavGroup } from "../lib/navigation/site-menu";

test("community menu includes Past Newsletters", () => {
  const communityGroup = SITE_MENU.find((item) => item.label === "Community");

  assert.ok(communityGroup);
  assert.equal(isNavGroup(communityGroup), true);
  if (!isNavGroup(communityGroup)) return;

  assert.equal(
    communityGroup.children.some((child) => child.href === "/newsletters" && child.label === "Past Newsletters"),
    true,
  );
});
```

`tests/ask-mekor.test.ts` — replace the nav test only (keep any other tests in the file):

```ts
test("community menu includes Ask Mekor", () => {
  const communityGroup = SITE_MENU.find((item) => item.label === "Community");
  assert.ok(communityGroup);
  assert.equal(isNavGroup(communityGroup), true);
  if (!communityGroup || !isNavGroup(communityGroup)) {
    throw new Error("Community menu group missing");
  }
  assert.equal(communityGroup.children.some((child) => child.href === "/ask-mekor" && child.label === "Ask Mekor"), true);
});
```

- [ ] **Step 2: Run the three tests, expect FAIL** (`GIVE_MENU` not exported yet):
`node node_modules/tsx/dist/cli.mjs --test tests/kiddush-navigation.test.ts tests/newsletter-navigation.test.ts tests/ask-mekor.test.ts`

- [ ] **Step 3: Replace `lib/navigation/site-menu.ts`** with the handoff `src/lib/navigation/site-menu.ts`, with one merge: re-add the `KIDDUSH_LINK` export after `SUPPORT_MEKOR_LINK` and reference it from `GIVE_MENU`:

```ts
export const KIDDUSH_LINK = {
  label: "Sponsor a Kiddush",
  href: "/kiddush",
} as const;

/** Split-button dropdown next to Donate. */
export const GIVE_MENU: NavLink[] = [
  { label: "Donate to Mekor", href: "/donations" },
  { label: KIDDUSH_LINK.label, href: KIDDUSH_LINK.href, note: "Celebrate a simcha with the community" },
];
```

Everything else verbatim from the handoff (types with `note`/`columns`, `MEMBERS_MENU`, `QUICK_TILES`, 6-item `SITE_MENU`, `MOBILE_GROUPS` indexing positions 2/4/5).

- [ ] **Step 4: Re-run the three tests.** The two pure-data tests pass; the source-scan test still fails on `nav-cta.tsx`/`mobile-drawer.tsx` (they're replaced in Tasks 3–4) — that's the expected intermediate state. Run `node node_modules/tsx/dist/cli.mjs --test tests/donation-visibility.test.ts tests/rabbi-link-fidelity.test.ts` — the `SUPPORT_MEKOR_LINK.href` and `/our-rabbi` guards must still pass.

- [ ] **Step 5: Commit** `Reorganize site menu data into six-item IA with give and members menus`

### Task 2: `UniversalSearch` hideTrigger prop

**Files:**
- Modify: `components/navigation/universal-search.tsx:29-31` (props type) and `:149-169` (trigger render)

**Interfaces:**
- Produces: `<UniversalSearch hideTrigger />` — mounts dialog + ⌘K/custom-event listeners without rendering the trigger button. Consumed by Task 6.

- [ ] **Step 1: Edit props type:**

```ts
type UniversalSearchProps = {
  compact?: boolean;
  hideTrigger?: boolean;
};
```

and signature `export function UniversalSearch({ compact = false, hideTrigger = false }: UniversalSearchProps)`.

- [ ] **Step 2: Wrap the trigger:**

```tsx
{hideTrigger ? null : (
  <DialogPrimitive.Trigger asChild>
    ...existing Button unchanged...
  </DialogPrimitive.Trigger>
)}
```

- [ ] **Step 3: Verify compile:** `npx tsc --noEmit` → no new errors.
- [ ] **Step 4: Commit** `Allow mounting universal search without its trigger button`

### Task 3: Mobile drawer replacement

**Files:**
- Modify: `components/navigation/mobile-drawer.tsx` (full replacement from handoff `src/components/navigation/mobile-drawer.tsx`)
- Test: `tests/dialog-accessibility.test.ts`, `tests/donation-visibility.test.ts`

**Interfaces:**
- Consumes: Task 1 exports (`GIVE_MENU`, `JOIN_US_LINK`, `KIDDUSH_LINK`, `MEMBERS_MENU`, `MOBILE_GROUPS`, `QUICK_TILES`, `SUPPORT_MEKOR_LINK`), `openUniversalSearch` (existing).
- Produces: `MobileDrawer` with unchanged prop type (`items` etc. stay in the type; component no longer renders `NavCta`). Site-navigation call site (Task 6) unchanged.

- [ ] **Step 1: Update `tests/dialog-accessibility.test.ts`** first assertion to the sr-only variant (intent preserved — Radix still auto-wires the title):

```ts
assert.match(drawerSource, /<SheetTitle className="sr-only">Browse Mekor<\/SheetTitle>/);
```

- [ ] **Step 2: Update `tests/donation-visibility.test.ts`** drawer assertions in the second test:

```ts
assert.match(drawerSource, /Donate to Mekor/);
assert.match(drawerSource, /<Heart className="h-4 w-4 flex-none"/);
assert.doesNotMatch(drawerSource, /HeartHandshake/);
```

(drop the `/Donate or sponsor/` and `/showDonate=\{false\}/` drawer assertions).

- [ ] **Step 3: Run both test files, expect FAIL** against the old drawer.

- [ ] **Step 4: Replace `components/navigation/mobile-drawer.tsx`** with the handoff file, one merge: `const sponsorKiddush = GIVE_MENU.find((link) => link.href === KIDDUSH_LINK.href);` (import `KIDDUSH_LINK` too). Structure per handoff: sr-only header, 2×2 `QUICK_TILES` grid, give card (gradient Donate row + `#1c4368` "Sponsor a Kiddush — celebrate a simcha" row), WhatsApp banner, `MOBILE_GROUPS` single-open accordions (`expandedId: string | null` seeded from active path), members strip (Sign In pill / Dashboard + Sign Out + 2-col `MEMBERS_MENU` when authed), demoted "Search the site ⌘K" text button calling `openUniversalSearch()`.

- [ ] **Step 5: Run the two test files, expect PASS.** Also `node node_modules/tsx/dist/cli.mjs --test tests/kiddush-navigation.test.ts` — drawer assertion now passes (nav-cta assertion still red until Task 4).

- [ ] **Step 6: Commit** `Redesign mobile drawer around quick tiles, give card, and members strip`

### Task 4: Desktop CTA cluster (`nav-cta.tsx`)

**Files:**
- Modify: `components/navigation/nav-cta.tsx` (full replacement from handoff `src/components/navigation/nav-cta.tsx`, verbatim)
- Test: `tests/donation-visibility.test.ts` (fourth test), `tests/kiddush-navigation.test.ts` (third test)

**Interfaces:**
- Consumes: Task 1 `GIVE_MENU`/`JOIN_US_LINK`/`SUPPORT_MEKOR_LINK`; `openUniversalSearch`; `Button` (default variant carries the navy gradient + `!text-[#f8fbff]`).
- Produces: `NavCta({ isSignedIn, isCheckingAuth })` — **`showDonate` prop is gone**. Only remaining caller after Task 3 is the header in `site-navigation.tsx`, which already omits it.

- [ ] **Step 1: Update the fourth donation-visibility test** — replace `assert.match(navCtaSource, /!text-\[#f8fbff\]/);` with:

```ts
assert.match(navCtaSource, /<Button asChild size="sm" className="rounded-none">/);
assert.match(navCtaSource, /aria-label="Donate to Mekor"/);
```

(The light text now comes from the Button default variant, asserted one line above via `buttonSource`.)

- [ ] **Step 2: Run donation-visibility + kiddush tests, expect FAIL** on the new assertions.

- [ ] **Step 3: Replace `components/navigation/nav-cta.tsx`** with the handoff file verbatim: 36px circular search ghost button → `openUniversalSearch()`; WhatsApp green pill (new tab); Donate split-button (default Button + heart primary segment, `#1c4368` chevron segment, 240px `GIVE_MENU` dropdown with outside-click/Escape/selection close); Sign In ghost → Dashboard + Sign Out when authed.

- [ ] **Step 4: Run donation-visibility + kiddush test files, expect PASS.**

- [ ] **Step 5: Commit** `Rebuild desktop CTA cluster with search icon, WhatsApp pill, and donate split-button`

### Task 5: Desktop nav (`desktop-nav.tsx`) — handoff visuals + ported repo behavior

**Files:**
- Modify: `components/navigation/desktop-nav.tsx` (full replacement: handoff `src/components/navigation/desktop-nav.tsx` merged with current file's interaction behavior)

**Interfaces:**
- Consumes: Task 1 `NavColumn`/`NavItem`/`isNavGroup`; `isNavigationPathActive`; unchanged props `{items, currentPath, openGroupId, setOpenGroupId}` (site-navigation call site untouched).

The handoff was written without seeing the current file; port these repo behaviors into the handoff structure (single trigger button per group, centered two-column panels, highlight card):

1. Hover-open: `onMouseEnter` opens (after `clearCloseTimer`), `onMouseLeave` schedules close with the 140ms timer.
2. Focus management: trigger `onFocus` opens; ArrowDown/Enter/Space opens and focuses first panel link via `requestAnimationFrame` querying `#native-desktop-panel-${groupId} a[href]`; Escape inside a panel link returns focus to that group's trigger (`groupButtonRefs`); root `onBlur` closes when focus leaves the nav.
3. Keep handoff's document-level pointerdown-outside + Escape closers and conditional panel rendering.

- [ ] **Step 1: Replace the file** with the merged implementation (full code in Appendix A of this plan).
- [ ] **Step 2: Verify compile:** `npx tsc --noEmit`.
- [ ] **Step 3: Commit** `Restyle desktop nav with two-column dropdown panels and plan-a-visit highlight`

### Task 6: Header integration (`site-navigation.tsx`)

**Files:**
- Modify: `components/navigation/site-navigation.tsx:12-16` (imports), `:122-148` (CTA cluster area)
- Test: `tests/donation-visibility.test.ts` (second test — `navigationSource` assertions unchanged and must still pass)

**Interfaces:**
- Consumes: Task 2 `<UniversalSearch hideTrigger />`; Task 4 `NavCta` (no `showDonate`).

- [ ] **Step 1: Edit the CTA cluster:**
  - Delete the `<div className="hidden sm:block"><UniversalSearch compact /></div>` block.
  - Delete the mobile-width Kiddush `<Button>` (lines 129–138) and the `KIDDUSH_LINK` import.
  - Keep the standalone mobile-width Donate `<Button>` (aria-label "Donate or sponsor Mekor") and the hamburger.
  - Mount `<UniversalSearch hideTrigger />` as a sibling right after the closing `</header>` tag (before the `MobileDrawer` wrapper `<div>`), so the dialog + ⌘K listener exist at every breakpoint.
- [ ] **Step 2: Run** `node node_modules/tsx/dist/cli.mjs --test tests/donation-visibility.test.ts tests/dialog-accessibility.test.ts` — expect PASS (navigation assertions: `Donate or sponsor Mekor`, `min-[1441px]:hidden`, Heart 3.5, `!text-[#f8fbff]`, no `titleId=`).
- [ ] **Step 3: Verify compile:** `npx tsc --noEmit`.
- [ ] **Step 4: Commit** `Slim header cluster to donate plus menu below desktop and mount hidden search`

### Task 7: Search label map keeps curated titles

**Files:**
- Modify: `lib/search/universal.ts:106-121` (`buildMenuLabelMap`-style loop)

**Interfaces:**
- Consumes: Task 1 `GIVE_MENU`, `MEMBERS_MENU`.

- [ ] **Step 1: Extend the loop** — after the `SITE_MENU` walk, add:

```ts
for (const link of [...GIVE_MENU, ...MEMBERS_MENU]) {
  const linkPath = normalizePathname(link.href);
  if (linkPath && !map.has(linkPath)) {
    map.set(linkPath, link.label);
  }
}
```

with the import updated to `import { GIVE_MENU, MEMBERS_MENU, SITE_MENU, isNavGroup } from "@/lib/navigation/site-menu";`. This preserves curated search titles for `/kiddush`, `/account`, `/account/dues`, `/members`, `/community`, `/account/profile` (formerly reachable via `SITE_MENU`) and adds `/donations`.

- [ ] **Step 2: Verify compile + run** `node node_modules/tsx/dist/cli.mjs --test tests/hidden-content-paths.test.ts` (nearest search-related coverage) → PASS.
- [ ] **Step 3: Commit** `Keep curated search titles for give and members destinations`

### Task 8: Prune legacy mobile nav CSS

**Files:**
- Modify: `app/globals.css:666-848` region (`.native-nav__mobile-*` rule blocks) and the `.native-nav__mobile-toggle` rule inside the `@media (max-width: 1180px)` block (~line 877)

Repo-wide grep confirms `native-nav__mobile` appears only in `globals.css`. **Keep** `body.native-nav--mobile-open { overflow: hidden; }` (the drawer toggles that class), `.native-nav__sr-only`, and every non-`__mobile-*` rule.

- [ ] **Step 1: Delete** the `.native-nav__mobile-toggle`, `-toggle:focus-visible`, `-drawer`, `-header`, `-close`, `-close:focus-visible`, `-nav`, `-list`, `-item`, `-link`, `-link.is-active`, `-group-row`, `-group-row .native-nav__mobile-link`, `-expand` (all variants), `-submenu` (both), `-sublink` (both), `-footer` (all three) blocks, plus the `.native-nav__mobile-toggle { display: inline-flex; }` rule inside the 1180px media query.
- [ ] **Step 2: Verify** `grep -c "native-nav__mobile" app/globals.css` → 0, and `grep -n "native-nav--mobile-open" app/globals.css` still present. Run `node node_modules/tsx/dist/cli.mjs --test tests/link-contrast-cascade.test.ts tests/donation-visibility.test.ts` → PASS.
- [ ] **Step 3: Commit** `Remove unused legacy mobile nav styles`

### Task 9: Full verification

- [ ] **Step 1:** `npm run lint` → clean; `npx tsc --noEmit` → clean.
- [ ] **Step 2:** `npm test` → all pass or pre-existing env-dependent skips only.
- [ ] **Step 3: Browser verification** (preview_start "Next.js Dev"):
  - ≥1441px: 6 nav items; Kosher Guide/Who We Are/Community two-column panels; "Plan a visit" highlight card; Membership single-column fallback; give split-button dropdown (open/close via outside click + Escape); search icon opens ⌘K dialog; WhatsApp pill.
  - Mobile (375×812): drawer quick tiles, give card, WhatsApp banner, single-open accordions (opening one collapses the other), active-path group pre-expanded, members strip Sign In, drawer search button opens dialog.
  - Screenshot both for the final report.
- [ ] **Step 4:** Update this plan's checkboxes; final commit if verification produced fixes.

---

## Appendix A — merged `desktop-nav.tsx` (Task 5)

```tsx
"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { isNavigationPathActive } from "@/lib/navigation/path";
import { isNavGroup, type NavColumn, type NavItem } from "@/lib/navigation/site-menu";
import { cn } from "@/lib/utils";

type DesktopNavProps = {
  items: NavItem[];
  currentPath: string;
  openGroupId: string | null;
  setOpenGroupId: (groupId: string | null) => void;
};

function getGroupId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * 6-item primary nav. Groups with `columns` render a two-column panel
 * (with optional highlighted card, e.g. "Plan a visit"); groups without
 * columns render a simple single-column dropdown.
 */
export function DesktopNav({ items, currentPath, openGroupId, setOpenGroupId }: DesktopNavProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenGroupId(null);
      closeTimerRef.current = null;
    }, 140);
  };

  const focusFirstSubmenuLink = (groupId: string) => {
    window.requestAnimationFrame(() => {
      const firstSubmenuLink = rootRef.current?.querySelector<HTMLAnchorElement>(
        `#native-desktop-panel-${groupId} a[href]`,
      );
      firstSubmenuLink?.focus();
    });
  };

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenGroupId(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroupId(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearCloseTimer();
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [setOpenGroupId]);

  return (
    <nav
      ref={rootRef}
      aria-label="Primary"
      className="hidden items-center gap-1 min-[1441px]:flex"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !rootRef.current?.contains(nextTarget)) {
          clearCloseTimer();
          setOpenGroupId(null);
        }
      }}
    >
      {items.map((item) => {
        const isActive = isNavigationPathActive(currentPath, item.href);

        if (!isNavGroup(item)) {
          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch={false}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-[15px] text-[var(--color-foreground)] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                isActive && "bg-white/85 font-semibold",
              )}
            >
              {item.label}
            </Link>
          );
        }

        const groupId = getGroupId(item.label);
        const isOpen = openGroupId === groupId;
        const groupActive =
          isActive || item.children.some((child) => isNavigationPathActive(currentPath, child.href));
        const columns: NavColumn[] =
          item.columns ?? [{ title: item.label, links: item.children }];

        return (
          <div
            key={item.label}
            className="relative"
            onMouseEnter={() => {
              clearCloseTimer();
              setOpenGroupId(groupId);
            }}
            onMouseLeave={scheduleClose}
          >
            <button
              ref={(node) => {
                groupButtonRefs.current[groupId] = node;
              }}
              type="button"
              aria-expanded={isOpen}
              aria-haspopup="true"
              aria-controls={`native-desktop-panel-${groupId}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[15px] text-[var(--color-foreground)] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                (isOpen || groupActive) && "bg-white/85 font-semibold shadow-[0_10px_24px_-18px_rgba(15,23,42,0.4)]",
              )}
              onClick={() => setOpenGroupId(isOpen ? null : groupId)}
              onFocus={() => {
                clearCloseTimer();
                setOpenGroupId(groupId);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setOpenGroupId(groupId);
                  focusFirstSubmenuLink(groupId);
                }
              }}
            >
              {item.label}
              <ChevronDown
                className={cn("h-3 w-3 text-[var(--color-muted)] transition-transform", isOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>

            {isOpen ? (
              <div
                id={`native-desktop-panel-${groupId}`}
                className="absolute left-1/2 top-[calc(100%+12px)] z-50 flex w-max max-w-[720px] -translate-x-1/2 gap-8 rounded-[20px] border border-[var(--color-border)] bg-white px-7 py-6 shadow-[0_34px_70px_-34px_rgba(15,23,42,0.4)]"
              >
                {columns.map((col) => (
                  <div
                    key={col.title}
                    className={cn(
                      "min-w-[190px]",
                      col.highlight &&
                        "-m-2 w-[240px] rounded-[14px] border border-[#d9e4ee] bg-[#f2f6fa] p-4",
                    )}
                  >
                    <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {col.title}
                    </div>
                    <div className="grid gap-0.5">
                      {col.links.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          prefetch={false}
                          onClick={() => setOpenGroupId(null)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setOpenGroupId(null);
                              groupButtonRefs.current[groupId]?.focus();
                            }
                          }}
                          aria-current={isNavigationPathActive(currentPath, link.href) ? "page" : undefined}
                          className={cn(
                            "-mx-2.5 rounded-[10px] px-2.5 py-2 text-[15px] leading-snug text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-strong)]",
                            isNavigationPathActive(currentPath, link.href) &&
                              "bg-[var(--color-surface-strong)] font-semibold",
                          )}
                        >
                          {link.label}
                          {link.note ? (
                            <span className="block text-[12.5px] text-[var(--color-muted)]">{link.note}</span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
```

## Design notes / resolved ambiguities

- **Flat nav vs. pill container:** the handoff `desktop-nav.tsx` (the approved mockup's structure) renders items directly on the page background — the `hover:bg-white/70` chips only read against the beige page, not inside the old `bg-white/72` pill bar. The old pill `<ul>` is dropped. "Layout unchanged" refers to the sticky header arrangement (brand left / nav center / CTA right), which is preserved.
- **Group labels are navigable only via panels on desktop** (single trigger button per handoff); group landing pages remain first entries in their panels.
- **Desktop members links:** the handoff README's IA section mentions members items "after the Dashboard entry on desktop," but the approved desktop-header spec and the handoff `nav-cta.tsx` render only Dashboard + Sign Out; the drawer gets the full `MEMBERS_MENU`. Ship per the code; flag in the PR as a possible follow-up.
- **`/community-life`:** intentionally unrouted placeholder; `triggerOnly` guarantees it never renders as a link (desktop trigger is a button; drawer accordion headers are buttons).
