import assert from "node:assert/strict";
import test from "node:test";

import { persistThenDeliver } from "@/lib/notifications/persist-after-delivery";

test("persistThenDeliver persists first and reports delivery failures", async () => {
  const order: string[] = [];

  const result = await persistThenDeliver({
    persist: async () => {
      order.push("persist");
      return { ok: true };
    },
    deliver: async () => {
      order.push("deliver");
      throw new Error("delivery failed");
    },
  });

  assert.deepEqual(order, ["persist", "deliver"]);
  assert.equal(result.delivered, false);
  assert.equal(result.deliveryError, "delivery failed");
  assert.deepEqual(result.persisted, { ok: true });
});

test("persistThenDeliver returns persisted result after successful delivery", async () => {
  const order: string[] = [];

  const result = await persistThenDeliver({
    persist: async () => {
      order.push("persist");
      return { ok: true };
    },
    deliver: async () => {
      order.push("deliver");
    },
  });

  assert.deepEqual(order, ["persist", "deliver"]);
  assert.equal(result.delivered, true);
  assert.equal(result.deliveryError, null);
  assert.deepEqual(result.persisted, { ok: true });
});
