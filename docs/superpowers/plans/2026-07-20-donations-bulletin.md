# Donations Redesign + Bulletin Copy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement both approved specs — the /donations redesign (actionable popular ways, modal + inline "Make a donation" flow with pre-fill and a dedication field, sticky donate pill, deduplicated page) and the /mekor-bulletin-board community-facing copy cleanup — then loop test → review → improve and open a stacked PR.

**Architecture:** Bulletin work is copy-only plus one section deletion (five files). Donations work adds a Radix dialog primitive, a `DonateExperience` client component owning the popular-ways grid + inline form + modal + sticky pill + `#donate` interception, three new designations, a `dedicationNote` passthrough on the checkout API, and a page restructure that leaves external methods in exactly one section.

**Tech Stack:** Next.js App Router, Tailwind arbitrary values, `@radix-ui/react-dialog` (already a dep via universal-search), node:test source-contract tests via `npm test`.

**Specs (exact copy source of truth):**
- `docs/superpowers/specs/2026-07-20-donations-redesign-design.md`
- `docs/superpowers/specs/2026-07-20-bulletin-copy-cleanup-design.md`

## Global Constraints
- Branch: `claude/donations-bulletin-redesign` (stacked on the nav branch; PR base = `claude/menu-redesign-implementation-151451`).
- "Secure donation intake" must appear nowhere after the change; form title default becomes "Make a donation"; trust line "Tax-deductible · Secure checkout via Stripe".
- New designations exactly: "Memorial plaque" `[100000]`, "Book dedication" `[10000, 20000]`, "Community dinner" `[180000, 100000]`.
- `dedicationNote`: optional, trimmed, max 300; flows to Stripe session + payment-intent metadata and `recordPayment` metadata.
- Sticky pill bottom-LEFT (feedback bubble owns bottom-right); hidden while modal open or inline form visible.
- Campaigns page (`app/campaigns/[slug]/page.tsx`) passes its own title/description/kind — form defaults must stay backward-compatible.
- All copy strings verbatim from the specs. Commit style: imperative sentence + Claude trailer.

---

### Task A: Bulletin copy cleanup (tests first)

**Files:**
- Create: `tests/bulletin-board-copy.test.ts`
- Modify: `tests/weekly-cleaned-newsletter.test.ts` (the `/Living Flyer Board/` line), `app/mekor-bulletin-board/page.tsx`, `app/mekor-bulletin-board/content.ts` (BOARD_NAV label), `app/mekor-bulletin-board/page.module.css` (intro styles), `app/page.tsx` (teaser paragraph), `lib/newsletter/weekly-cleaned.ts` (bulletin blurb)

- [ ] **Step A1: New contract test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("bulletin board shell copy speaks to members, not about content strategy", async () => {
  const [pageSource, contentSource, homepageSource, newsletterSource] = await Promise.all([
    readTextFile("app/mekor-bulletin-board/page.tsx"),
    readTextFile("app/mekor-bulletin-board/content.ts"),
    readTextFile("app/page.tsx"),
    readTextFile("lib/newsletter/weekly-cleaned.ts"),
  ]);

  for (const source of [pageSource, homepageSource, newsletterSource]) {
    assert.doesNotMatch(source, /Living Flyer Board/i);
    assert.doesNotMatch(source, /stays? focused/);
  }
  assert.doesNotMatch(pageSource, /One board for repeating/);
  assert.doesNotMatch(pageSource, /used to repeat/);
  assert.match(pageSource, /Community Essentials/);
  assert.match(pageSource, /kept up to date/);
  assert.match(contentSource, /label: "Essentials"/);
  assert.match(homepageSource, /every standing notice, one click away/);
  assert.match(newsletterSource, /always on the <strong>Mekor Bulletin Board<\/strong>/);
});
```

- [ ] **Step A2:** Update `tests/weekly-cleaned-newsletter.test.ts`: `assert.match(html, /Living Flyer Board/);` → `assert.match(html, /always on the <strong>Mekor Bulletin Board<\/strong>/);`
- [ ] **Step A3:** Run both test files — expect FAIL (old copy present).
- [ ] **Step A4:** Apply the eight copy edits exactly as listed in the bulletin spec (hero eyebrow/lead, delete intro section JSX + its `boardIntro`/`introCopy`/`introGallery`/`introThumb` CSS, Featured desc, Community Essentials h2 + desc, BOARD_NAV label, homepage teaser, newsletter blurb).
- [ ] **Step A5:** Run both test files + `tests/link-contrast-cascade.test.ts` — expect PASS. Commit `Make bulletin board copy community-facing and drop the meta intro`.

### Task B: Donations designations + checkout dedicationNote (config/API layer)

**Files:**
- Modify: `lib/payments/shared.ts`, `app/api/donations/checkout/route.ts`, `tests/donation-suggested-amounts.test.ts`
- Create: `tests/donations-page.test.ts` (first assertions)

**Interfaces (produced):** `DESIGNATION_OPTIONS` gains "Memorial plaque" | "Book dedication" | "Community dinner"; `DESIGNATION_SUGGESTED_AMOUNTS_CENTS` gains the three entries; checkout schema gains `dedicationNote: z.string().trim().max(300).default("")`, included in both Stripe metadata objects and `recordPayment` metadata.

- [ ] **Step B1:** Start `tests/donations-page.test.ts` with the config/API assertions:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { DESIGNATION_OPTIONS, DESIGNATION_SUGGESTED_AMOUNTS_CENTS } from "../lib/payments/shared";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("popular-ways designations exist with their spec amounts", () => {
  for (const designation of ["Memorial plaque", "Book dedication", "Community dinner"]) {
    assert.ok(DESIGNATION_OPTIONS.includes(designation as (typeof DESIGNATION_OPTIONS)[number]));
  }
  assert.deepEqual(DESIGNATION_SUGGESTED_AMOUNTS_CENTS["Memorial plaque"], [100000]);
  assert.deepEqual(DESIGNATION_SUGGESTED_AMOUNTS_CENTS["Book dedication"], [10000, 20000]);
  assert.deepEqual(DESIGNATION_SUGGESTED_AMOUNTS_CENTS["Community dinner"], [180000, 100000]);
});

test("checkout API accepts and forwards a dedication note", async () => {
  const source = await readTextFile("app/api/donations/checkout/route.ts");
  assert.match(source, /dedicationNote: z\.string\(\)\.trim\(\)\.max\(300\)\.default\(""\)/);
  const metadataMentions = source.match(/dedicationNote/g) ?? [];
  assert.ok(metadataMentions.length >= 4, "dedicationNote must reach session, intent, and ledger metadata");
});
```

- [ ] **Step B2:** Run → FAIL. Implement: add the three designations + amounts to `lib/payments/shared.ts`; add `dedicationNote` to the checkout schema and spread `...(parsed.data.dedicationNote ? { dedicationNote: parsed.data.dedicationNote } : {})` into session metadata, payment-intent metadata, and the `recordPayment` metadata object.
- [ ] **Step B3:** Run donations-page + donation-suggested-amounts + payments + kiddush-checkout tests → PASS (update `tests/donation-suggested-amounts.test.ts`'s final test anchor from "Donate inside Mekor" to "Make a donation" — it will go green in Task D). Commit `Add popular-way designations and a dedication note to donation checkout`.

### Task C: Dialog primitive

**Files:**
- Create: `components/ui/dialog.tsx`

**Interfaces (produced):** `Dialog` (Root), `DialogContent` (portal + overlay + centered card + close X, props `{ className?, children, ...Radix Content props }`), `DialogTitle`, `DialogDescription` — shadcn-style, visual language matching universal-search's dialog (overlay `rgba(16,24,32,0.52)` + backdrop-blur, card `rounded-[28px] border bg-[linear-gradient(180deg,#fffdf8_0%,#f7f2e8_100%)]`).

- [ ] **Step C1:** Write the component:

```tsx
"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(16,24,32,0.52)] backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-[6vh] z-50 max-h-[88vh] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 overflow-y-auto rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(180deg,#fffdf8_0%,#f7f2e8_100%)] p-5 shadow-[0_32px_90px_-34px_rgba(15,23,42,0.52)] focus-visible:outline-none sm:p-7",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close asChild>
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/82 text-[var(--color-muted)] transition hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger };
```

- [ ] **Step C2:** `npx tsc --noEmit` — no new errors. Commit `Add a reusable dialog primitive`.

### Task D: Donation form rename + dedication field + itemName passthrough

**Files:**
- Modify: `components/payments/donation-checkout-form.tsx`, `tests/donations-page.test.ts` (add form assertions), `tests/donation-suggested-amounts.test.ts` (anchor swap from Task B)

**Interfaces (produced):** new optional props `itemName?: string | null` (default null, sent in POST when set), `frameless?: boolean` (default false — modal usage skips the Card wrapper); new internal `dedicationNote` state + input labeled "Dedication / in honor of (optional)", sent in POST when non-empty; default `title` becomes "Make a donation"; Badge replaced by `<p>` trust line `Tax-deductible · Secure checkout via Stripe`.

- [ ] **Step D1:** Add to `tests/donations-page.test.ts`:

```ts
test("donation form speaks to donors and carries the dedication note", async () => {
  const source = await readTextFile("components/payments/donation-checkout-form.tsx");
  assert.doesNotMatch(source, /Secure donation intake/i);
  assert.match(source, /Make a donation/);
  assert.match(source, /Tax-deductible · Secure checkout via Stripe/);
  assert.match(source, /Dedication \/ in honor of \(optional\)/);
  assert.match(source, /dedicationNote/);
  assert.match(source, /itemName/);
});
```

- [ ] **Step D2:** Run → FAIL. Implement: title default swap, Badge → trust line, `dedicationNote` state + input (placed after Phone, `md:col-span-2 xl:col-span-3`), POST body gains `...(itemName ? { itemName } : {})` and `...(dedicationNote.trim() ? { dedicationNote: dedicationNote.trim() } : {})`, `frameless` renders children without `<Card>` (extract inner JSX to a variable).
- [ ] **Step D3:** Run donations-page + donation-suggested-amounts + donation-visibility → PASS. Commit `Rename donation intake to Make a donation and add dedication notes`.

### Task E: Popular ways config + DonateExperience client component

**Files:**
- Create: `app/donations/popular-ways.ts`, `components/donations/donate-experience.tsx`
- Modify: `tests/donations-page.test.ts` (experience assertions)

**Interfaces (produced):**

`app/donations/popular-ways.ts`:

```ts
export type PopularWay = {
  label: string;
  note: string;
  href?: string;
  designation?: string;
  amountCents?: number;
};

export const POPULAR_WAYS: PopularWay[] = [
  { label: "Kiddush or Third Meal sponsorship", note: "$295 members · $360 non-members", href: "/kiddush" },
  { label: "Memorial plaque in the sanctuary", note: "$1,000", designation: "Memorial plaque", amountCents: 100000 },
  { label: "Dedicate a Siddur or Machzor", note: "$100 each", designation: "Book dedication", amountCents: 10000 },
  { label: "Dedicate a Chumash", note: "$200", designation: "Book dedication", amountCents: 20000 },
  { label: "Community dinner sponsorship", note: "$1,800 full · $1,000 half", designation: "Community dinner", amountCents: 180000 },
  { label: "General contribution", note: "Any amount is appreciated", designation: "General donation" },
];
```

`DonateExperience({ popularWays }: { popularWays: PopularWay[] })` renders, in order: the popular grid section (cards = buttons opening the modal with that way, except `href` entries which render `Link`s), the inline form section (`id="donate"`, wraps `DonationCheckoutForm` with page defaults), the sticky pill, and the modal (`Dialog` + `DialogContent` + frameless form keyed by selection). Behaviors: document click listener intercepts `a[href="#donate"]` → open modal (unconfigured); IntersectionObservers on a top sentinel and the inline section drive sticky visibility (`showSticky = sentinelPassed && !inlineVisible && !open`).

- [ ] **Step E1:** Add to `tests/donations-page.test.ts`:

```ts
test("donate experience wires cards, modal, sticky pill, and #donate interception", async () => {
  const [experienceSource, waysSource] = await Promise.all([
    readTextFile("components/donations/donate-experience.tsx"),
    readTextFile("app/donations/popular-ways.ts"),
  ]);
  assert.match(experienceSource, /IntersectionObserver/);
  assert.match(experienceSource, /a\[href="#donate"\]/);
  assert.match(experienceSource, /DialogContent/);
  assert.match(experienceSource, /id="donate"/);
  assert.match(waysSource, /href: "\/kiddush"/);
  const ways = (waysSource.match(/label: "/g) ?? []).length;
  assert.ok(ways >= 6);
});
```

- [ ] **Step E2:** Run → FAIL. Implement both files (full code in this plan's Appendix — grid cards `bg-white/80 border rounded-[18px] min-h-[44px]` with label/note/arrow, sticky pill `fixed bottom-5 left-5 z-40` navy-gradient Button style, modal remount `key={selected?.label ?? "default"}`).
- [ ] **Step E3:** Run the file → PASS. `npx tsc --noEmit` clean for new files. Commit `Add donate experience with popular-way cards, modal flow, and sticky pill`.

### Task F: Page restructure

**Files:**
- Modify: `app/donations/page.tsx`, `app/donations/page.module.css`, `tests/donations-page.test.ts` (page assertions)

- [ ] **Step F1:** Add to `tests/donations-page.test.ts`:

```ts
test("donations page keeps one home per giving path", async () => {
  const source = await readTextFile("app/donations/page.tsx");
  assert.match(source, /DonateExperience/);
  assert.match(source, /id="other-ways"/);
  assert.match(source, /Popular ways to give/);
  assert.doesNotMatch(source, /Quick Donation Links/);
  assert.doesNotMatch(source, /Donate by Card/);
  const stripeLinks = (source.match(/STRIPE_DONATION_URL/g) ?? []).length;
  assert.equal(stripeLinks, 2, "declaration plus exactly one render usage");
  assert.match(source, /href="#donate"/);
  assert.match(source, /Sponsor a Kiddush/);
});
```

- [ ] **Step F2:** Run → FAIL. Restructure the page per the spec order: hero (new actions), `<SectionCard title="Popular ways to give">` intro line + `<DonateExperience popularWays={POPULAR_WAYS} />` (which itself renders grid + `#donate` form), dedications split panel + opportunities, legacy dedication section, "More ways to give" section (`id="other-ways"`, methods grid + check paragraph), affiliates, footer. Delete `COMMON_WAYS_TO_GIVE`, the standalone checkout SectionCard, the stripe promo, and quick-links sections. Prune now-unused module CSS (`commonList`, `commonRow`, `commonLabel`, `commonAmount`, `stripeCard`, `stripePromo*`, `stripeButton`, `quickLinksCluster`, `checkoutSection` if unused).
- [ ] **Step F3:** Run full `npm test` → all pass. Commit `Restructure donations page around one actionable giving flow`.

### Task G: Verification + review loop + PR

- [ ] **Step G1:** `npm run lint` (0 errors), `npx tsc --noEmit` (no new vs. baseline), `npm test` fresh (all pass).
- [ ] **Step G2:** Browser: /donations desktop + mobile — popular card opens modal preset (designation + amount chips active), `#donate` hero button opens modal, Escape/outside closes, sticky pill appears after hero / hides at inline form / bottom-left, dedication field present, form title "Make a donation", other-ways section single home for external links; /mekor-bulletin-board — new hero copy, no intro section, "Community Essentials", chip nav "Essentials". Screenshots.
- [ ] **Step G3:** superpowers:requesting-code-review on the branch diff; fix CONFIRMED findings; re-run tests; repeat until no confirmed findings.
- [ ] **Step G4:** Push branch; `gh pr create --base claude/menu-redesign-implementation-151451` with both specs summarized; note stacking on PR #76.

## Appendix — `components/donations/donate-experience.tsx`

```tsx
"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DonationCheckoutForm } from "@/components/payments/donation-checkout-form";
import type { PopularWay } from "@/app/donations/popular-ways";
import { cn } from "@/lib/utils";

type DonateExperienceProps = {
  popularWays: PopularWay[];
};

export function DonateExperience({ popularWays }: DonateExperienceProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PopularWay | null>(null);
  const [heroPassed, setHeroPassed] = useState(false);
  const [inlineVisible, setInlineVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inlineRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.('a[href="#donate"]');
      if (!anchor) return;
      event.preventDefault();
      setSelected(null);
      setOpen(true);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const inline = inlineRef.current;
    if (!sentinel || !inline) return;
    const sentinelObserver = new IntersectionObserver(
      ([entry]) => setHeroPassed(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    const inlineObserver = new IntersectionObserver(([entry]) => setInlineVisible(entry.isIntersecting));
    sentinelObserver.observe(sentinel);
    inlineObserver.observe(inline);
    return () => {
      sentinelObserver.disconnect();
      inlineObserver.disconnect();
    };
  }, []);

  function openWay(way: PopularWay) {
    setSelected(way);
    setOpen(true);
  }

  const showSticky = heroPassed && !inlineVisible && !open;

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {popularWays.map((way) => {
          const body = (
            <>
              <span className="text-[15px] font-semibold leading-snug text-[var(--color-foreground)]">{way.label}</span>
              <span className="text-[13px] text-[var(--color-muted)]">{way.note}</span>
              <span className="mt-auto pt-2 text-sm font-semibold text-[var(--color-accent)]">
                {way.href ? "Open sponsorship page →" : "Give this →"}
              </span>
            </>
          );
          const cardClassName =
            "flex min-h-[44px] flex-col gap-1 rounded-[18px] border border-[var(--color-border)] bg-white/80 px-4 py-3.5 text-left shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)] transition hover:border-[var(--color-border-strong)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";
          if (way.href) {
            return (
              <Link key={way.label} href={way.href} prefetch={false} className={cardClassName}>
                {body}
              </Link>
            );
          }
          return (
            <button key={way.label} type="button" onClick={() => openWay(way)} className={cardClassName}>
              {body}
            </button>
          );
        })}
      </div>

      <section id="donate" ref={inlineRef} aria-label="Make a donation" className="scroll-mt-28">
        <DonationCheckoutForm returnPath="/donations" showSuggestedAmounts />
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">Make a donation</DialogTitle>
          <DialogDescription className="sr-only">Choose an amount and continue to secure checkout.</DialogDescription>
          <DonationCheckoutForm
            key={selected?.label ?? "default"}
            frameless
            returnPath="/donations"
            showSuggestedAmounts
            defaultDesignation={selected?.designation ?? "General donation"}
            defaultAmountCents={selected?.amountCents ?? 3600}
            itemName={selected?.label ?? null}
          />
        </DialogContent>
      </Dialog>

      <button
        type="button"
        onClick={() => {
          setSelected(null);
          setOpen(true);
        }}
        className={cn(
          "fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full border border-transparent bg-[linear-gradient(180deg,#2f6fa8_0%,#214e79_100%)] px-5 py-3 text-sm font-semibold !text-[#f8fbff] shadow-[0_18px_45px_-24px_rgba(15,23,42,0.65)] transition hover:!text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
          showSticky ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
        aria-hidden={!showSticky}
        tabIndex={showSticky ? 0 : -1}
      >
        <Heart className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        Donate
      </button>
    </>
  );
}
```

## Self-review
Spec coverage: hero actions (F), popular cards actionable + preset (E/F), modal + inline (E), rename + trust line (D), pre-fill (existing hook, verified in G2), dedicationNote end-to-end (B/D), designations (B), sticky bottom-left with hide rules (E), dedup page (F), bulletin eight edits + tests (A), review loop + stacked PR (G). Type consistency: `PopularWay` fields match between config, component, and tests; `itemName`/`frameless` props consistent D↔E. No placeholders.
