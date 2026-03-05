import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { familyInvites, inboxMessages, inboxParticipants, memberEventAttendees } from "@/db/schema";
import { familyServiceErrorResponse, requireFamilyActor } from "@/lib/families/http";
import { acceptFamilyInvite, declineFamilyInvite, revokeFamilyInvite } from "@/lib/families/service";
import {
  approveMemberEventRequest,
  MemberEventServiceError,
  rejectMemberEventRequest,
} from "@/lib/member-events/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const inboxActionSchema = z.union([
  z.object({
    action: z.enum(["accept", "decline", "revoke"]),
    inviteId: z.number().int().min(1),
  }),
  z.object({
    action: z.enum(["approve", "reject"]),
    eventId: z.number().int().min(1),
    requestId: z.number().int().min(1),
  }),
]);

function parseThreadId(rawId: string) {
  const threadId = Number.parseInt(rawId, 10);
  if (!Number.isInteger(threadId) || threadId < 1) {
    return null;
  }
  return threadId;
}

export async function POST(request: Request, context: RouteContext) {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;
  const actor = actorResult.actor;

  const threadId = parseThreadId((await context.params).id);
  if (!threadId) {
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  const [participant] = await getDb()
    .select({ id: inboxParticipants.id })
    .from(inboxParticipants)
    .where(and(eq(inboxParticipants.threadId, threadId), eq(inboxParticipants.userId, actor.id)))
    .limit(1);

  if (!participant) {
    return NextResponse.json({ error: "You are not a participant in this thread" }, { status: 403 });
  }

  const parsed = inboxActionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if ("inviteId" in parsed.data && parsed.data.action === "accept") {
      const [invite] = await getDb()
        .select({
          id: familyInvites.id,
        })
        .from(familyInvites)
        .where(and(eq(familyInvites.id, parsed.data.inviteId), eq(familyInvites.threadId, threadId)))
        .limit(1);

      if (!invite) {
        return NextResponse.json({ error: "Invite not found for this thread" }, { status: 404 });
      }

      const result = await acceptFamilyInvite({
        actorUserId: actor.id,
        inviteId: parsed.data.inviteId,
      });
      return NextResponse.json({ ok: true, action: "accept", ...result });
    }

    if ("inviteId" in parsed.data && parsed.data.action === "decline") {
      const [invite] = await getDb()
        .select({
          id: familyInvites.id,
        })
        .from(familyInvites)
        .where(and(eq(familyInvites.id, parsed.data.inviteId), eq(familyInvites.threadId, threadId)))
        .limit(1);

      if (!invite) {
        return NextResponse.json({ error: "Invite not found for this thread" }, { status: 404 });
      }

      const result = await declineFamilyInvite({
        actorUserId: actor.id,
        inviteId: parsed.data.inviteId,
      });
      return NextResponse.json({ ok: true, action: "decline", ...result });
    }

    if ("inviteId" in parsed.data && parsed.data.action === "revoke") {
      const [invite] = await getDb()
        .select({
          id: familyInvites.id,
        })
        .from(familyInvites)
        .where(and(eq(familyInvites.id, parsed.data.inviteId), eq(familyInvites.threadId, threadId)))
        .limit(1);

      if (!invite) {
        return NextResponse.json({ error: "Invite not found for this thread" }, { status: 404 });
      }

      const result = await revokeFamilyInvite({
        actorUserId: actor.id,
        inviteId: parsed.data.inviteId,
      });
      return NextResponse.json({ ok: true, action: "revoke", ...result });
    }

    if ("requestId" in parsed.data && parsed.data.action === "approve") {
      const eventAction = parsed.data;
      const [threadAction] = await getDb()
        .select({ id: inboxMessages.id })
        .from(inboxMessages)
        .where(
          sql`${inboxMessages.threadId} = ${threadId}
            and ${inboxMessages.messageType} = 'action'
            and ${inboxMessages.actionPayloadJson}->>'kind' = 'member_event_request'
            and (${inboxMessages.actionPayloadJson}->>'eventId')::int = ${eventAction.eventId}
            and (${inboxMessages.actionPayloadJson}->>'requestId')::int = ${eventAction.requestId}`,
        )
        .limit(1);

      if (!threadAction) {
        return NextResponse.json({ error: "Request action not available in this thread" }, { status: 404 });
      }

      const [requestRow] = await getDb()
        .select({
          id: memberEventAttendees.id,
        })
        .from(memberEventAttendees)
        .where(and(eq(memberEventAttendees.id, eventAction.requestId), eq(memberEventAttendees.eventId, eventAction.eventId)))
        .limit(1);

      if (!requestRow) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      const attendee = await approveMemberEventRequest({
        actorUserId: actor.id,
        eventId: eventAction.eventId,
        requestId: eventAction.requestId,
      });

      return NextResponse.json({ ok: true, action: "approve", attendee });
    }

    if ("requestId" in parsed.data && parsed.data.action === "reject") {
      const eventAction = parsed.data;
      const [threadAction] = await getDb()
        .select({ id: inboxMessages.id })
        .from(inboxMessages)
        .where(
          sql`${inboxMessages.threadId} = ${threadId}
          and ${inboxMessages.messageType} = 'action'
          and ${inboxMessages.actionPayloadJson}->>'kind' = 'member_event_request'
          and (${inboxMessages.actionPayloadJson}->>'eventId')::int = ${eventAction.eventId}
          and (${inboxMessages.actionPayloadJson}->>'requestId')::int = ${eventAction.requestId}`,
        )
        .limit(1);

      if (!threadAction) {
        return NextResponse.json({ error: "Request action not available in this thread" }, { status: 404 });
      }

      const [requestRow] = await getDb()
        .select({
          id: memberEventAttendees.id,
        })
        .from(memberEventAttendees)
        .where(and(eq(memberEventAttendees.id, eventAction.requestId), eq(memberEventAttendees.eventId, eventAction.eventId)))
        .limit(1);

      if (!requestRow) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      const attendee = await rejectMemberEventRequest({
        actorUserId: actor.id,
        eventId: eventAction.eventId,
        requestId: eventAction.requestId,
      });

      return NextResponse.json({ ok: true, action: "reject", attendee });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    if (error instanceof MemberEventServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return familyServiceErrorResponse(error);
  }
}
