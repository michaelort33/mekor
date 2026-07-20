import assert from "node:assert/strict";
import test from "node:test";

import { isHiddenContentPath } from "../lib/content/hidden-paths";
import nextConfig from "../next.config";

test("keeps only the 1911 Sansom Goldie listing public", () => {
  assert.equal(isHiddenContentPath("/post/goldie-1"), false);

  for (const path of ["/post/goldie", "/post/goldie-2", "/post/goldie-3", "/post/goldie-4"]) {
    assert.equal(isHiddenContentPath(path), true);
  }
});

test("hides the closed HipCityVeg 40th Street listing", () => {
  assert.equal(isHiddenContentPath("/post/hipcityveg"), false);
  assert.equal(isHiddenContentPath("/post/hipcityveg-1"), true);
});

test("redirects the closed HipCityVeg detail URL to the active location", async () => {
  const redirects = await nextConfig.redirects?.();

  assert.ok(
    redirects?.some(
      (redirect) =>
        redirect.source === "/post/hipcityveg-1" &&
        redirect.destination === "/post/hipcityveg" &&
        redirect.permanent,
    ),
  );
});
