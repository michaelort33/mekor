import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getDb } from "@/db/client";
import { adminAuditLog, newsletterTemplates } from "@/db/schema";
import { listNewsletterAudiences } from "@/lib/newsletter/audiences";
import {
  NewsletterStudioClient,
  type NewsletterStudioMessage,
} from "./studio-client";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

type StoredChatTurn = {
  prompt: string;
  response: string;
  tools: string[];
  htmlChanged: boolean;
  subjectChanged: boolean;
};

export default async function NewsletterStudioPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const fromParam = resolvedSearchParams.from;
  const fromNew = fromParam === "new" || (Array.isArray(fromParam) && fromParam.includes("new"));
  const audienceParam = resolvedSearchParams.audience;
  const requestedAudience = Array.isArray(audienceParam) ? audienceParam[0] : audienceParam;
  // Audience keys are dynamic (michael_test, admins_only, newsletter_subscribers, topic:<key>);
  // the client resolves them against the fetched audience list.
  const initialAudience = requestedAudience && /^[a-z0-9_:-]{1,100}$/.test(requestedAudience)
    ? requestedAudience
    : undefined;
  const templateId = Number(id);

  if (!Number.isInteger(templateId) || templateId < 1) {
    notFound();
  }

  if (!process.env.DATABASE_URL) {
    return (
      <AdminShell
        currentPath="/admin/templates"
        title="Newsletter Studio"
        description="Split HTML editor and live preview with chat-assisted edits."
        breadcrumbs={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/templates", label: "Newsletters" },
          { label: "Studio" },
        ]}
      >
        <p>DATABASE_URL is not configured.</p>
      </AdminShell>
    );
  }

  const db = getDb();
  const [template] = await db
    .select()
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, templateId))
    .limit(1);

  if (!template) {
    notFound();
  }

  const initialAudiences = await listNewsletterAudiences().catch(() => undefined);

  const historyRows = await db
    .select({
      id: adminAuditLog.id,
      payloadJson: adminAuditLog.payloadJson,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .where(
      and(
        eq(adminAuditLog.action, "newsletter.template.chat.turn"),
        eq(adminAuditLog.targetType, "newsletter_template"),
        eq(adminAuditLog.targetId, String(templateId)),
      ),
    )
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(25);

  const initialMessages: NewsletterStudioMessage[] = historyRows.reverse().flatMap((row) => {
    const turn = row.payloadJson as StoredChatTurn;
    const createdAt = row.createdAt.toISOString();
    const changes = [
      ...(turn.htmlChanged ? ["HTML updated"] : []),
      ...(turn.subjectChanged ? ["Subject updated"] : []),
      ...(turn.tools ?? []),
    ];

    return [
      {
        id: `history-${row.id}-user`,
        role: "user" as const,
        metadata: { persisted: true, createdAt },
        parts: [{ type: "text" as const, text: turn.prompt }],
      },
      {
        id: `history-${row.id}-assistant`,
        role: "assistant" as const,
        metadata: { persisted: true, createdAt, changes },
        parts: [{ type: "text" as const, text: turn.response }],
      },
    ];
  });

  return (
    <NewsletterStudioClient
      template={template}
      initialMessages={initialMessages}
      fromNew={fromNew}
      initialAudience={initialAudience}
      initialAudiences={initialAudiences}
    />
  );
}
