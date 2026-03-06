import assert from "node:assert/strict";
import test from "node:test";

import { getManualPaymentStatusForInvoiceTransition } from "@/lib/dues/admin-invoices";

test("manual payment status is created when admin marks invoice paid", () => {
  assert.equal(
    getManualPaymentStatusForInvoiceTransition({
      previousStatus: "open",
      nextStatus: "paid",
    }),
    "succeeded",
  );
});

test("manual payment status is reversed when admin reopens or voids a paid invoice", () => {
  assert.equal(
    getManualPaymentStatusForInvoiceTransition({
      previousStatus: "paid",
      nextStatus: "open",
    }),
    "failed",
  );

  assert.equal(
    getManualPaymentStatusForInvoiceTransition({
      previousStatus: "paid",
      nextStatus: "overdue",
    }),
    "failed",
  );

  assert.equal(
    getManualPaymentStatusForInvoiceTransition({
      previousStatus: "paid",
      nextStatus: "void",
    }),
    "refunded",
  );
});

test("manual payment status is unchanged when invoice status does not cross paid state", () => {
  assert.equal(
    getManualPaymentStatusForInvoiceTransition({
      previousStatus: "open",
      nextStatus: "overdue",
    }),
    null,
  );

  assert.equal(
    getManualPaymentStatusForInvoiceTransition({
      previousStatus: "paid",
      nextStatus: "paid",
    }),
    null,
  );
});
