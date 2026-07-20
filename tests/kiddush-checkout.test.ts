import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("kiddush checkout is a single guided flow with rate selection", async () => {
  const source = await readTextFile("components/payments/kiddush-payment-section.tsx");

  assert.match(source, /Choose a Kiddush/);
  assert.match(source, /Pick your rate/);
  assert.match(source, /Your details/);
  assert.match(source, /role="radiogroup"/);
  assert.match(source, /Pay \$\{formatCents\(effectiveCents\)\} securely|Pay \$/);
});

test("kiddush checkout posts a Kiddush designation with a descriptive item name", async () => {
  const source = await readTextFile("components/payments/kiddush-payment-section.tsx");

  assert.match(source, /\/api\/donations\/checkout/);
  assert.match(source, /designation:\s*"Kiddush"/);
  assert.match(source, /itemName/);
});

test("donations checkout API accepts an optional cosmetic item name", async () => {
  const source = await readTextFile("app/api/donations/checkout/route.ts");

  assert.match(source, /itemName:\s*z\.string\(\)/);
  assert.match(source, /lineItemName/);
  assert.match(source, /name:\s*lineItemName/);
});

test("kiddush sponsorship options expose structured rate tiers", async () => {
  const source = await readTextFile("app/kiddush/page.tsx");

  assert.match(source, /rates:\s*\[/);
  assert.match(source, /id:\s*"member",\s*label:\s*"Member"/);
  assert.match(source, /id:\s*"non-member",\s*label:\s*"Non-member"/);
});
