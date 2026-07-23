import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { inboxMessages, inboxParticipants, inboxThreads, users } from "@/db/schema";
import { FamilyServiceError } from "@/lib/families/service";
import { getDirectoryDisplayName } from "@/lib/users/profile";
import { isDirectoryEligibleRole, isVisibleToMembers } from "@/lib/users/visibility";

type DrizzleTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

function fail(status: number, code: string, message: string): never {
  throw new FamilyServiceError(status, code, message);
}

function clean(value: string | undefined) {
  return (value ?? "").trim();
}

async function ensureParticipant(tx: DrizzleTx, threadId: number, userId: number) {
  const now = new Date();
  await tx
    .insert(inboxParticipants)
    .values({
      threadId,
      userId,
      lastReadAt: null,
      muted: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [inboxParticipants.threadId, inboxParticipants.userId],
      set: { updatedAt: now },
    });
}

async function findExistingDirectThread(tx: DrizzleTx, actorUserId: number, recipientUserId: number) {
  const actorThreads = await tx
    .select({
      threadId: inboxParticipants.threadId,
    })
    .from(inboxParticipants)
    .innerJoin(inboxThreads, eq(inboxThreads.id, inboxParticipants.threadId))
    .where(and(eq(inboxParticipants.userId, actorUserId), eq(inboxThreads.type, "direct")))
    .orderBy(desc(inboxThreads.updatedAt), desc(inboxThreads.id));

  if (actorThreads.length === 0) {
    return null;
  }

  const threadIds = actorThreads.map((row) => row.threadId);
  const participantRows = await tx
    .select({
      threadId: inboxParticipants.threadId,
      userId: inboxParticipants.userId,
    })
    .from(inboxParticipants)
    .where(inArray(inboxParticipants.threadId, threadIds));

  const usersByThread = new Map<number, number[]>();
  for (const row of participantRows) {
    const list = usersByThread.get(row.threadId) ?? [];
    list.push(row.userId);
    usersByThread.set(row.threadId, list);
  }

  for (const { threadId } of actorThreads) {
    const participantIds = usersByThread.get(threadId) ?? [];
    if (
      participantIds.length === 2 &&
      participantIds.includes(actorUserId) &&
      participantIds.includes(recipientUserId)
    ) {
      return threadId;
    }
  }

  return null;
}

export async function startOrGetDirectThread(input: {
  actorUserId: number;
  recipientUserId: number;
  body?: string;
}) {
  const recipientUserId = input.recipientUserId;
  if (!Number.isInteger(recipientUserId) || recipientUserId < 1) {
    fail(400, "INVALID_RECIPIENT", "Recipient is required");
  }
  if (recipientUserId === input.actorUserId) {
    fail(400, "CANNOT_MESSAGE_SELF", "You cannot start a conversation with yourself");
  }

  const initialBody = clean(input.body);
  if (initialBody.length > 4000) {
    fail(400, "MESSAGE_TOO_LONG", "Message exceeds 4000 characters");
  }

  return getDb().transaction(async (tx) => {
    const [actor] = await tx
      .select({
        id: users.id,
        displayName: users.displayName,
        role: users.role,
        profileVisibility: users.profileVisibility,
        profileFieldVisibility: users.profileFieldVisibilityJson,
      })
      .from(users)
      .where(eq(users.id, input.actorUserId))
      .limit(1);
    if (!actor || !isDirectoryEligibleRole(actor.role)) {
      fail(403, "FORBIDDEN", "Only approved members can message other members");
    }

    const [recipient] = await tx
      .select({
        id: users.id,
        displayName: users.displayName,
        role: users.role,
        profileVisibility: users.profileVisibility,
        profileFieldVisibility: users.profileFieldVisibilityJson,
      })
      .from(users)
      .where(eq(users.id, recipientUserId))
      .limit(1);

    if (!recipient || !isDirectoryEligibleRole(recipient.role)) {
      fail(404, "RECIPIENT_NOT_FOUND", "Member not found");
    }
    if (!isVisibleToMembers(recipient.profileVisibility)) {
      fail(403, "RECIPIENT_NOT_VISIBLE", "This member is not visible in the directory");
    }

    const existingThreadId = await findExistingDirectThread(tx, actor.id, recipient.id);
    const now = new Date();

    if (existingThreadId) {
      if (initialBody) {
        await tx.insert(inboxMessages).values({
          threadId: existingThreadId,
          senderUserId: actor.id,
          messageType: "text",
          body: initialBody,
          actionPayloadJson: {},
          createdAt: now,
          updatedAt: now,
        });
      }
      // Bump so reopening via Message surfaces the thread even without a new body.
      await tx.update(inboxThreads).set({ updatedAt: now }).where(eq(inboxThreads.id, existingThreadId));
      return {
        threadId: existingThreadId,
        created: false,
      };
    }

    const recipientLabel = getDirectoryDisplayName({
      displayName: recipient.displayName,
      profileVisibility: recipient.profileVisibility,
      profileFieldVisibility: recipient.profileFieldVisibility,
    });
    const actorLabel = getDirectoryDisplayName({
      displayName: actor.displayName,
      profileVisibility: actor.profileVisibility,
      profileFieldVisibility: actor.profileFieldVisibility,
    });
    const [thread] = await tx
      .insert(inboxThreads)
      .values({
        type: "direct",
        subject: `Message · ${recipientLabel}`,
        familyId: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: inboxThreads.id,
      });

    if (!thread) {
      fail(500, "THREAD_CREATE_FAILED", "Unable to start conversation");
    }

    await ensureParticipant(tx, thread.id, actor.id);
    await ensureParticipant(tx, thread.id, recipient.id);

    await tx.insert(inboxMessages).values({
      threadId: thread.id,
      senderUserId: null,
      messageType: "system",
      body: `${actorLabel} started a conversation with ${recipientLabel}.`,
      actionPayloadJson: {},
      createdAt: now,
      updatedAt: now,
    });

    if (initialBody) {
      await tx.insert(inboxMessages).values({
        threadId: thread.id,
        senderUserId: actor.id,
        messageType: "text",
        body: initialBody,
        actionPayloadJson: {},
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx.update(inboxThreads).set({ updatedAt: now }).where(eq(inboxThreads.id, thread.id));

    return {
      threadId: thread.id,
      created: true,
    };
  });
}
