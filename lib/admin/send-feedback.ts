export type SendFeedbackStatus = "success" | "partial" | "failure";

export function buildSendFeedback(input: {
  label: string;
  successCount: number;
  failedCount: number;
  skippedCount?: number;
}) {
  const skippedCount = input.skippedCount ?? 0;
  const attemptedCount = input.successCount + input.failedCount + skippedCount;

  if (attemptedCount === 0) {
    return {
      status: "partial" as const satisfies SendFeedbackStatus,
      message: `${input.label} delivered to no one. Success: ${input.successCount}, failed: ${input.failedCount}, skipped: ${skippedCount}.`,
    };
  }

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

export type CampaignResultNoticeStatus = SendFeedbackStatus | "info";

/**
 * Map send/preview API payloads to studio notices, including mid-batch "sending".
 */
export function buildCampaignResultNotice(input: {
  label?: string;
  mode?: "preview" | "send" | "schedule" | string;
  status?: string;
  recipientCount?: number;
  successCount?: number;
  failedCount?: number;
  skippedCount?: number;
  campaignId?: number;
}): { status: CampaignResultNoticeStatus; message: string } {
  const label = input.label ?? "Campaign";

  if (input.mode === "preview") {
    return {
      status: "info",
      message: `Preview ready for ${input.recipientCount ?? 0} recipient(s). No email was sent.`,
    };
  }

  if (input.mode === "schedule" || input.status === "scheduled") {
    return {
      status: "info",
      message: `${label} scheduled${input.campaignId ? ` (#${input.campaignId})` : ""}.`,
    };
  }

  if (input.status === "sending" || input.status === "queued") {
    const queued = input.recipientCount ?? 0;
    return {
      status: "info",
      message: `${label} queued and still sending${input.campaignId ? ` (#${input.campaignId})` : ""}. ${queued} recipient(s) in batch — refresh campaign logs for final counts.`,
    };
  }

  return buildSendFeedback({
    label,
    successCount: input.successCount ?? 0,
    failedCount: input.failedCount ?? 0,
    skippedCount: input.skippedCount ?? 0,
  });
}
