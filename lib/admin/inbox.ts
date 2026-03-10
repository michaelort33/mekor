import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { adminInboxEvents } from "@/db/schema";

export const ADMIN_NOTIFICATION_CATEGORIES = [
  "general_forms",
  "volunteer",
  "kosher",
  "davening",
  "kiddush",
  "auxiliary_membership",
  "newsletter_signup",
] as const;

export type AdminNotificationCategory = (typeof ADMIN_NOTIFICATION_CATEGORIES)[number];
export type AdminInboxSourceType = "form_submission" | "mailchimp_signup";
export type AdminInboxStatus = "new" | "read" | "archived";
export type PublicFormType =
  | "contact"
  | "kosher-inquiry"
  | "volunteer"
  | "davening-rsvp"
  | "auxiliary-membership"
  | "kiddush-sponsorship";

export function getCategoryLabel(category: AdminNotificationCategory) {
  switch (category) {
    case "general_forms":
      return "General Forms";
    case "volunteer":
      return "Volunteer";
    case "kosher":
      return "Kosher";
    case "davening":
      return "Davening";
    case "kiddush":
      return "Kiddush";
    case "auxiliary_membership":
      return "Auxiliary Membership";
    case "newsletter_signup":
      return "Newsletter Signup";
  }
}

export function getCategoryForForm(input: {
  formType: PublicFormType;
  sourcePath: string;
}): AdminNotificationCategory {
  if (input.formType === "contact") {
    return "general_forms";
  }
  if (input.formType === "volunteer") {
    return "volunteer";
  }
  if (input.formType === "kosher-inquiry") {
    return "kosher";
  }
  if (input.formType === "davening-rsvp") {
    return "davening";
  }
  if (input.formType === "kiddush-sponsorship") {
    return "kiddush";
  }
  return "auxiliary_membership";
}

export function getCategoryForMailchimpSignup(): AdminNotificationCategory {
  return "newsletter_signup";
}

export function getFormLabel(formType: PublicFormType) {
  switch (formType) {
    case "contact":
      return "Contact Request";
    case "volunteer":
      return "Volunteer Request";
    case "kosher-inquiry":
      return "Kosher Update";
    case "davening-rsvp":
      return "Davening Request";
    case "auxiliary-membership":
      return "Auxiliary Membership Request";
    case "kiddush-sponsorship":
      return "Kiddush Sponsorship Request";
  }
}

export function buildInboxSummary(input: { message: string; sourcePath: string }) {
  const trimmed = input.message.trim();
  const preview = trimmed.length > 220 ? `${trimmed.slice(0, 217)}...` : trimmed;
  return input.sourcePath ? `${input.sourcePath}: ${preview}` : preview;
}

export function buildAdminInboxDeepLink(siteOrigin: string, eventId: number) {
  return `${siteOrigin}/admin/messages?direction=inbound&id=${eventId}`;
}

export function buildSourceRecordHref(input: { sourceType: AdminInboxSourceType; sourceId: string }) {
  if (input.sourceType === "form_submission") {
    return `/admin/messages?direction=inbound&id=${input.sourceId}`;
  }
  return `/admin/messages?direction=inbound&id=${input.sourceId}`;
}

export async function createAdminInboxEvent(input: {
  sourceType: AdminInboxSourceType;
  category: AdminNotificationCategory;
  sourceId: string;
  title: string;
  submitterName: string;
  submitterEmail: string;
  submitterPhone: string;
  summary: string;
  payloadJson: Record<string, unknown>;
}) {
  const [event] = await getDb()
    .insert(adminInboxEvents)
    .values({
      sourceType: input.sourceType,
      category: input.category,
      sourceId: input.sourceId,
      title: input.title,
      submitterName: input.submitterName,
      submitterEmail: input.submitterEmail,
      submitterPhone: input.submitterPhone,
      summary: input.summary,
      payloadJson: input.payloadJson,
    })
    .returning();

  if (!event) {
    throw new Error("Failed to create admin inbox event");
  }

  return event;
}

export async function updateAdminInboxEventStatus(id: number, status: AdminInboxStatus) {
  const [event] = await getDb()
    .update(adminInboxEvents)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(adminInboxEvents.id, id))
    .returning();

  return event ?? null;
}
