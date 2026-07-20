import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyFailure,
  contrastRatio,
  isLargeText,
  meetsWcagAa,
  parseCssColor,
  relativeLuminance,
} from "../scripts/review/contrast-lib";

test("parseCssColor understands hex and rgb forms", () => {
  assert.deepEqual(parseCssColor("#214e79"), { r: 33, g: 78, b: 121, a: 1 });
  assert.deepEqual(parseCssColor("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseCssColor("#f8fbff"), { r: 248, g: 251, b: 255, a: 1 });
  assert.deepEqual(parseCssColor("rgb(29, 44, 63)"), { r: 29, g: 44, b: 63, a: 1 });
  assert.deepEqual(parseCssColor("rgba(29, 44, 63, 0.5)"), { r: 29, g: 44, b: 63, a: 0.5 });
  assert.equal(parseCssColor("oklch(0.5 0.1 120)"), null);
  assert.equal(parseCssColor("transparent"), null);
});

test("navy on navy fails AA; light text on navy passes", () => {
  const navy = parseCssColor("#214e79");
  const light = parseCssColor("#f8fbff");
  assert.ok(navy && light);

  const same = contrastRatio(navy, navy);
  assert.ok(same < 1.1);
  assert.equal(classifyFailure(same, false), "fail-aa");
  assert.equal(meetsWcagAa(same, false), false);

  const readable = contrastRatio(light, navy);
  assert.ok(readable >= 4.5);
  assert.equal(classifyFailure(readable, false), "pass");
  assert.equal(meetsWcagAa(readable, false), true);
});

test("dark body text on cream background passes AA", () => {
  const fg = parseCssColor("#1d2c3f");
  const bg = parseCssColor("#f8f3eb");
  assert.ok(fg && bg);
  const ratio = contrastRatio(fg, bg);
  assert.ok(ratio >= 4.5);
  assert.equal(meetsWcagAa(ratio, false), true);
});

test("white on white fails AA", () => {
  const white = parseCssColor("#ffffff");
  assert.ok(white);
  const ratio = contrastRatio(white, white);
  assert.ok(ratio < 1.1);
  assert.equal(classifyFailure(ratio, false), "fail-aa");
});

test("large text uses the 3:1 AA threshold", () => {
  assert.equal(isLargeText(24, 400), true);
  assert.equal(isLargeText(18.66, 700), true);
  assert.equal(isLargeText(16, 400), false);
  assert.equal(isLargeText(18, 400), false);

  // ~3.2:1 mid gray on white — fails normal AA, passes large AA.
  const gray = parseCssColor("#949494");
  const white = parseCssColor("#ffffff");
  assert.ok(gray && white);
  const ratio = contrastRatio(gray, white);
  assert.ok(ratio >= 3 && ratio < 4.5);
  assert.equal(meetsWcagAa(ratio, false), false);
  assert.equal(meetsWcagAa(ratio, true), true);
  assert.equal(classifyFailure(ratio, true), "pass");
  assert.equal(classifyFailure(ratio, false), "fail-aa");
});

test("relativeLuminance is higher for lighter colors", () => {
  const dark = parseCssColor("#1d2c3f");
  const light = parseCssColor("#f8fbff");
  assert.ok(dark && light);
  assert.ok(relativeLuminance(light) > relativeLuminance(dark));
});
