export type SendFeedbackStatus = "success" | "partial" | "failure";

export function buildSendFeedback(input: {
  label: string;
  successCount: number;
  failedCount: number;
  skippedCount?: number;
}) {
  const skippedCount = input.skippedCount ?? 0;

  if (input.successCount === 0 && input.failedCount > 0) {
    return {
      status: "failure" as const satisfies SendFeedbackStatus,
      message: `${input.label} failed. Success: ${input.successCount}, failed: ${input.failedCount}, skipped: ${skippedCount}.`,
    };
  }

  if (input.successCount === 0 && skippedCount > 0) {
    return {
      status: "partial" as const satisfies SendFeedbackStatus,
      message: `${input.label} delivered to no one. Success: ${input.successCount}, failed: ${input.failedCount}, skipped: ${skippedCount}.`,
    };
  }

  if (input.failedCount > 0 || skippedCount > 0) {
    return {
      status: "partial" as const satisfies SendFeedbackStatus,
      message: `${input.label} partially completed. Success: ${input.successCount}, failed: ${input.failedCount}, skipped: ${skippedCount}.`,
    };
  }

  return {
    status: "success" as const satisfies SendFeedbackStatus,
    message: `${input.label} sent. Success: ${input.successCount}, failed: ${input.failedCount}, skipped: ${skippedCount}.`,
  };
}
