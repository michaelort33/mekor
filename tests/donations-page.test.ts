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
    assert.ok(
      DESIGNATION_OPTIONS.includes(designation as (typeof DESIGNATION_OPTIONS)[number]),
      `${designation} missing from DESIGNATION_OPTIONS`,
    );
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
  assert.ok(ways >= 6, "expect at least six popular ways");
});

test("donations page keeps one home per giving path", async () => {
  const source = await readTextFile("app/donations/page.tsx");
  assert.match(source, /DonateExperience/);
  assert.match(source, /id="other-ways"/);
  assert.match(source, /Popular ways to give/);
  assert.doesNotMatch(source, /Quick Donation Links/);
  assert.doesNotMatch(source, /Donate by Card/);
  const stripeLinks = (source.match(/STRIPE_DONATION_URL/g) ?? []).length;
  assert.equal(stripeLinks, 2, "declaration plus exactly one render usage");
  assert.match(source, /href: "#donate"/);
  assert.match(source, /Sponsor a Kiddush/);
});

test("donation form speaks to donors and carries the dedication note", async () => {
  const source = await readTextFile("components/payments/donation-checkout-form.tsx");
  assert.doesNotMatch(source, /Secure donation intake/i);
  assert.match(source, /Make a donation/);
  assert.match(source, /Tax-deductible · Secure checkout via Stripe/);
  assert.match(source, /Dedication \/ in honor of \(optional\)/);
  assert.match(source, /dedicationNote/);
  assert.match(source, /itemName/);
});
