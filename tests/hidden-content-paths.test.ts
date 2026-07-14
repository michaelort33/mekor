import assert from "node:assert/strict";
import test from "node:test";

import { isHiddenContentPath } from "../lib/content/hidden-paths";

test("keeps only the 1911 Sansom Goldie listing public", () => {
  assert.equal(isHiddenContentPath("/post/goldie-1"), false);

  for (const path of ["/post/goldie", "/post/goldie-2", "/post/goldie-3", "/post/goldie-4"]) {
    assert.equal(isHiddenContentPath(path), true);
  }
});
