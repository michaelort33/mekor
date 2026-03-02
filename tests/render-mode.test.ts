import assert from "node:assert/strict";
import test from "node:test";

import {
  getConfiguredRenderMode,
  getEffectiveRenderMode,
  isForceMirrorAllEnabled,
} from "../lib/routing/render-mode";

test("render mode defaults to mirror for unmapped routes", () => {
  assert.equal(getConfiguredRenderMode("/some-unmapped-path"), "mirror");
});

test("render mode registry resolves configured native routes", () => {
  assert.equal(getConfiguredRenderMode("/events"), "native");
  assert.equal(getConfiguredRenderMode("/events?view=month"), "native");
});

test("global mirror kill switch forces mirror mode", () => {
  assert.equal(isForceMirrorAllEnabled("true"), true);
  assert.equal(getEffectiveRenderMode("/events", "true"), "mirror");
  assert.equal(getEffectiveRenderMode("/events", "false"), "native");
});
