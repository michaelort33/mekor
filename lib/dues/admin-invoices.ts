export type AdminInvoiceStatus = "open" | "paid" | "void" | "overdue";
export type ManualPaymentStatus = "succeeded" | "failed" | "refunded";

export function getManualPaymentStatusForInvoiceTransition(input: {
  previousStatus: AdminInvoiceStatus;
  nextStatus: AdminInvoiceStatus;
}) {
  if (input.previousStatus !== "paid" && input.nextStatus === "paid") {
    return "succeeded" satisfies ManualPaymentStatus;
  }

  if (input.previousStatus === "paid" && input.nextStatus !== "paid") {
    return input.nextStatus === "void" ? "refunded" : "failed";
  }

  return null;
}
