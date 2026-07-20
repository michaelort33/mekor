import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { DESIGNATION_OPTIONS, DESIGNATION_SUGGESTED_AMOUNTS_CENTS } from "../lib/payments/shared";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("every suggested designation is a real designation option", () => {
  for (const designation of Object.keys(DESIGNATION_SUGGESTED_AMOUNTS_CENTS)) {
    assert.ok(
      DESIGNATION_OPTIONS.includes(designation as (typeof DESIGNATION_OPTIONS)[number]),
      `${designation} is not a known designation`,
    );
  }
});

test("kiddush switches away from the low general default to a full kiddush amount", () => {
  const kiddush = DESIGNATION_SUGGESTED_AMOUNTS_CENTS.Kiddush;
  assert.ok(kiddush && kiddush.length > 0);
  // The first amount becomes the default when a donor picks Kiddush; it must not
  // stay on the $36 general default.
  assert.equal(kiddush[0], 29500);
  assert.notEqual(kiddush[0], 3600);
});

test("suggested amounts are all valid Stripe amounts (>= $1)", () => {
  for (const amounts of Object.values(DESIGNATION_SUGGESTED_AMOUNTS_CENTS)) {
    for (const cents of amounts) {
      assert.ok(Number.isInteger(cents) && cents >= 100, `${cents} is not a valid amount`);
    }
  }
});

test("donation checkout form links amount to designation and renders quick picks", async () => {
  const source = await readTextFile("components/payments/donation-checkout-form.tsx");

  assert.match(source, /showSuggestedAmounts/);
  assert.match(source, /handleDesignationChange/);
  assert.match(source, /DESIGNATION_SUGGESTED_AMOUNTS_CENTS\[nextDesignation\]/);
  assert.match(source, /Use the guided Kiddush page/);
});

test("donations page shows suggested amounts and a concise common-ways card above the form", async () => {
  const [source, experienceSource] = await Promise.all([
    readTextFile("app/donations/page.tsx"),
    readTextFile("components/donations/donate-experience.tsx"),
  ]);

  assert.match(source, /Popular ways to give/);
  assert.match(experienceSource, /showSuggestedAmounts/);
  const commonIndex = source.indexOf("Popular ways to give");
  const formIndex = source.lastIndexOf("DonateExperience");
  assert.ok(commonIndex >= 0 && formIndex >= 0);
  assert.ok(commonIndex < formIndex, "common-ways card must render above the checkout form");
});
