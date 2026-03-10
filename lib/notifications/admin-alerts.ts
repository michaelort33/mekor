import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  adminNotificationPreferences,
  adminInboxEvents,
  notificationsOutbox,
  users,
} from "@/db/schema";
import { getCategoryLabel, type AdminNotificationCategory } from "@/lib/admin/inbox";
import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

type InboxEventRecord = typeof adminInboxEvents.$inferSelect;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAdminAlertSubject(input: { category: AdminNotificationCategory; title: string; submitterName: string }) {
  const prefix = getCategoryLabel(input.category);
  const submitter = input.submitterName || "New submission";
  return `[Mekor] ${prefix}: ${input.title} from ${submitter}`;
}

function buildAdminAlertText(input: {
  event: InboxEventRecord;
  category: AdminNotificationCategory;
  deepLink: string;
}) {
  return [
    `${getCategoryLabel(input.category)} alert`,
    "",
    `Title: ${input.event.title}`,
    `Reference: #${input.event.id}`,
    `Name: ${input.event.submitterName || ""}`,
    `Email: ${input.event.submitterEmail || ""}`,
    `Phone: ${input.event.submitterPhone || ""}`,
    "",
    input.event.summary,
    "",
    `Open in admin: ${input.deepLink}`,
  ].join("\n");
}

function buildAdminAlertHtml(input: {
  event: InboxEventRecord;
  category: AdminNotificationCategory;
  deepLink: string;
}) {
  const title = escapeHtml(input.event.title);
  const category = escapeHtml(getCategoryLabel(input.category));
  const submitterName = escapeHtml(input.event.submitterName || "");
  const submitterEmail = escapeHtml(input.event.submitterEmail || "");
  const submitterPhone = escapeHtml(input.event.submitterPhone || "");
  const summary = escapeHtml(input.event.summary || "");

  return `
    <div style="background:#f4f6f9;padding:32px 16px;font-family:Arial,sans-serif;color:#1f3043;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d8e0e8;border-radius:20px;overflow:hidden;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#16324f 0%,#315a86 100%);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.86;">${category}</div>
          <h1 style="margin:12px 0 0;font-size:30px;line-height:1.1;">${title}</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="margin:0 0 18px;font-size:15px;color:#5b6d7e;">Reference <strong>#${input.event.id}</strong></p>
          <div style="margin:0 0 18px;padding:18px 20px;border:1px solid #dde6ee;border-radius:16px;background:#f9fbfd;">
            <strong>${submitterName || "No submitter name"}</strong><br />
            ${submitterEmail || "No email"}<br />
            ${submitterPhone || "No phone"}
          </div>
          <div style="margin:0 0 22px;padding:18px 20px;border-radius:16px;background:#fbf5e8;border:1px solid #e7dac0;white-space:pre-wrap;">${summary}</div>
          <a href="${input.deepLink}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#1f4f78;color:#ffffff;text-decoration:none;font-weight:700;">Open in Admin Inbox</a>
        </div>
      </div>
    </div>
  `;
}

async function listOptedInSuperAdmins(category: AdminNotificationCategory) {
  return getDb()
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(adminNotificationPreferences)
    .innerJoin(users, eq(users.id, adminNotificationPreferences.userId))
    .where(
      and(
        eq(adminNotificationPreferences.category, category),
        eq(adminNotificationPreferences.enabled, true),
        eq(users.role, "super_admin"),
      ),
    );
}

export async function sendAdminInboxAlerts(input: {
  event: InboxEventRecord;
  category: AdminNotificationCategory;
  siteOrigin: string;
}) {
  const recipients = await listOptedInSuperAdmins(input.category);
  if (recipients.length === 0) {
    return { recipientCount: 0 };
  }

  const deepLink = `${input.siteOrigin}/admin/messages?direction=inbound&id=${input.event.id}`;
  const subject = buildAdminAlertSubject({
    category: input.category,
    title: input.event.title,
    submitterName: input.event.submitterName,
  });
  const text = buildAdminAlertText({ event: input.event, category: input.category, deepLink });
  const html = buildAdminAlertHtml({ event: input.event, category: input.category, deepLink });

  for (const recipient of recipients) {
    const now = new Date();
    const [outbox] = await getDb()
      .insert(notificationsOutbox)
      .values({
        userId: recipient.userId,
        threadId: null,
        channel: "email",
        toAddress: recipient.email,
        subject,
        body: text,
        provider: "sendgrid_admin_inbox",
        status: "queued",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: notificationsOutbox.id });

    try {
      const sent = await sendSendGridEmail({
        to: recipient.email,
        subject,
        text,
        html,
      });

      await getDb()
        .update(notificationsOutbox)
        .set({
          status: "sent",
          providerMessageId: sent.providerMessageId,
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notificationsOutbox.id, outbox.id));
    } catch (error) {
      await getDb()
        .update(notificationsOutbox)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unable to send admin inbox alert",
          updatedAt: new Date(),
        })
        .where(eq(notificationsOutbox.id, outbox.id));
    }
  }

  return { recipientCount: recipients.length };
}
