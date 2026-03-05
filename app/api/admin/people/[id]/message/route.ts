import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { people } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { sendMessageCampaign } from "@/lib/messages/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const payloadSchema = z.object({
  mode: z.enum(["preview", "send"]).default("send"),
  channel: z.enum(["email", "sms", "whatsapp"]).default("email"),
  subject: z.string().trim().min(2).max(255),
  body: z.string().min(2).max(120000),
});

function parsePersonId(rawId: string) {
  const personId = Number.parseInt(rawId, 10);
  if (!Number.isInteger(personId) || personId < 1) return null;
  return personId;
}

export async function POST(request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const personId = parsePersonId((await context.params).id);
  if (!personId) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const [person] = await getDb()
    .select({
      id: people.id,
      displayName: people.displayName,
      email: people.email,
    })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);
  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  try {
    const result = await sendMessageCampaign({
      actorUserId: actor.id,
      actorRole: actor.role,
      source: "manual",
      channel: parsed.data.channel,
      name: `Outreach · ${person.displayName || person.email}`,
      subject: parsed.data.subject,
      body: parsed.data.body,
      personIds: [personId],
      previewOnly: parsed.data.mode === "preview",
    });

    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: parsed.data.mode === "preview" ? "people.message.previewed" : "people.message.sent",
      targetType: "person",
      targetId: String(person.id),
      payload: {
        channel: parsed.data.channel,
        recipientEmail: person.email,
        recipientCount: result.recipientCount,
        mode: parsed.data.mode,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send message" }, { status: 400 });
  }
}
