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

test("donation form speaks to donors and carries the dedication note", async () => {
  const source = await readTextFile("components/payments/donation-checkout-form.tsx");
  assert.doesNotMatch(source, /Secure donation intake/i);
  assert.match(source, /Make a donation/);
  assert.match(source, /Tax-deductible · Secure checkout via Stripe/);
  assert.match(source, /Dedication \/ in honor of \(optional\)/);
  assert.match(source, /dedicationNote/);
  assert.match(source, /itemName/);
});
