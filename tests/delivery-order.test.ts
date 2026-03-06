import assert from "node:assert/strict";
import test from "node:test";

import { persistAfterSuccessfulDelivery } from "@/lib/notifications/persist-after-delivery";

test("persistAfterSuccessfulDelivery does not persist when delivery fails", async () => {
  let persisted = false;

  await assert.rejects(
    () =>
      persistAfterSuccessfulDelivery({
        deliver: async () => {
          throw new Error("delivery failed");
        },
        persist: async () => {
          persisted = true;
          return { ok: true };
        },
      }),
    /delivery failed/,
  );

  assert.equal(persisted, false);
});

test("persistAfterSuccessfulDelivery persists after delivery succeeds", async () => {
  const order: string[] = [];

  const result = await persistAfterSuccessfulDelivery({
    deliver: async () => {
      order.push("deliver");
    },
    persist: async () => {
      order.push("persist");
      return { ok: true };
    },
  });

  assert.deepEqual(order, ["deliver", "persist"]);
  assert.deepEqual(result, { ok: true });
});
