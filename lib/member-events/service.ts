import { and, asc, desc, eq, gte, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  adminAuditLog,
  inboxMessages,
  inboxParticipants,
  inboxThreads,
  memberEventActivityLog,
  memberEventAttendees,
  memberEventComments,
  memberEvents,
  users,
} from "@/db/schema";
import { allowWithinWindow } from "@/lib/invitations/rate-limit";
import { calculateAttendanceRate, resolveMemberEventJoinStatus } from "@/lib/member-events/logic";

type UserRole = "visitor" | "member" | "admin" | "super_admin";
type MemberEventStatus = "draft" | "published" | "cancelled" | "completed";
type MemberEventVisibility = "members_only" | "public";
type MemberEventJoinMode = "open_join" | "request_to_join";
type MemberEventAttendeeStatus = "requested" | "approved" | "rejected" | "cancelled" | "waitlisted";

type SessionActor = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
};

type DrizzleTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export class MemberEventServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function fail(status: number, code: string, message: string): never {
  throw new MemberEventServiceError(status, code, message);
}

function isAdminRole(role: UserRole) {
  return role === "admin" || role === "super_admin";
}

function clean(value: string | undefined) {
  return (value ?? "").trim();
}

async function getActor(userId: number) {
  const [actor] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!actor) {
    fail(404, "ACTOR_NOT_FOUND", "User not found");
  }

  return actor;
}

async function ensureThreadParticipant(tx: DrizzleTx, threadId: number, userId: number) {
  const now = new Date();
  await tx
    .insert(inboxParticipants)
    .values({
      threadId,
      userId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [inboxParticipants.threadId, inboxParticipants.userId],
      set: {
        updatedAt: now,
      },
    });
}

async function createJoinRequestInboxThread(input: {
  tx: DrizzleTx;
  event: {
    id: number;
    title: string;
    hostUserId: number;
  };
  attendee: {
    id: number;
    userId: number;
  };
  actor: SessionActor;
}) {
  const now = new Date();

  const [thread] = await input.tx
    .insert(inboxThreads)
    .values({
      type: "system",
      subject: `Member event request · ${input.event.title}`,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: inboxThreads.id,
    });

  await ensureThreadParticipant(input.tx, thread.id, input.event.hostUserId);
  await ensureThreadParticipant(input.tx, thread.id, input.actor.id);

  await input.tx.insert(inboxMessages).values({
    threadId: thread.id,
    senderUserId: null,
    messageType: "action",
    body: `${input.actor.displayName} requested to join "${input.event.title}".`,
    actionPayloadJson: {
      kind: "member_event_request",
      eventId: input.event.id,
      requestId: input.attendee.id,
      actions: [
        { type: "approve", label: "Approve" },
        { type: "reject", label: "Reject" },
      ],
    },
    createdAt: now,
    updatedAt: now,
  });

  await input.tx.update(inboxThreads).set({ updatedAt: now }).where(eq(inboxThreads.id, thread.id));
}

async function logEventActivity(input: {
  tx: DrizzleTx;
  eventId: number;
  actorUserId: number | null;
  attendeeId?: number | null;
  action: string;
  payload?: Record<string, unknown>;
}) {
  await input.tx.insert(memberEventActivityLog).values({
    eventId: input.eventId,
    actorUserId: input.actorUserId,
    attendeeId: input.attendeeId ?? null,
    action: input.action,
    payloadJson: input.payload ?? {},
    createdAt: new Date(),
  });
}

async function logAudit(input: {
  tx: DrizzleTx;
  actorUserId: number;
  action: string;
  targetId: string;
  payload?: Record<string, unknown>;
}) {
  await input.tx.insert(adminAuditLog).values({
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: "member_event",
    targetId: input.targetId,
    payloadJson: input.payload ?? {},
    createdAt: new Date(),
  });
}

async function getApprovedAttendeeCount(tx: DrizzleTx, eventId: number) {
  const [row] = await tx
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(memberEventAttendees)
    .where(and(eq(memberEventAttendees.eventId, eventId), eq(memberEventAttendees.status, "approved")));
  return row?.count ?? 0;
}

async function loadEventForWrite(tx: DrizzleTx, eventId: number) {
  await tx.execute(sql`select id from member_events where id = ${eventId} for update`);
  const [event] = await tx
    .select({
      id: memberEvents.id,
      hostUserId: memberEvents.hostUserId,
      title: memberEvents.title,
      description: memberEvents.description,
      startsAt: memberEvents.startsAt,
      endsAt: memberEvents.endsAt,
      location: memberEvents.location,
      capacity: memberEvents.capacity,
      joinMode: memberEvents.joinMode,
      visibility: memberEvents.visibility,
      status: memberEvents.status,
      createdAt: memberEvents.createdAt,
      updatedAt: memberEvents.updatedAt,
    })
    .from(memberEvents)
    .where(eq(memberEvents.id, eventId))
    .limit(1);
  return event;
}

export async function createMemberEvent(input: {
  actorUserId: number;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string;
  capacity?: number | null;
  joinMode: MemberEventJoinMode;
  visibility: MemberEventVisibility;
  publishNow?: boolean;
}) {
  const actor = await getActor(input.actorUserId);

  const now = new Date();
  const [created] = await getDb()
    .insert(memberEvents)
    .values({
      hostUserId: actor.id,
      title: clean(input.title),
      description: clean(input.description),
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      location: clean(input.location),
      capacity: input.capacity ?? null,
      joinMode: input.joinMode,
      visibility: input.visibility,
      status: input.publishNow ? "published" : "draft",
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: memberEvents.id,
      hostUserId: memberEvents.hostUserId,
      title: memberEvents.title,
      description: memberEvents.description,
      startsAt: memberEvents.startsAt,
      endsAt: memberEvents.endsAt,
      location: memberEvents.location,
      capacity: memberEvents.capacity,
      joinMode: memberEvents.joinMode,
      visibility: memberEvents.visibility,
      status: memberEvents.status,
      createdAt: memberEvents.createdAt,
      updatedAt: memberEvents.updatedAt,
    });

  await getDb().transaction(async (tx) => {
    await logEventActivity({
      tx,
      eventId: created.id,
      actorUserId: actor.id,
      action: "event.created",
      payload: {
        publishNow: Boolean(input.publishNow),
      },
    });
    await logAudit({
      tx,
      actorUserId: actor.id,
      action: "member_event.created",
      targetId: String(created.id),
      payload: {
        title: created.title,
        status: created.status,
      },
    });
  });

  return created;
}

export async function listMemberEvents(input: {
  viewerUserId?: number;
  includeHostedByViewer?: boolean;
  includeDraft?: boolean;
  includePast?: boolean;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(input.limit ?? 40, 100));
  const now = new Date();
  const viewer = input.viewerUserId ? await getActor(input.viewerUserId).catch(() => null) : null;
  const allowMembersOnly = Boolean(viewer);

  const whereClause = and(
    input.includeHostedByViewer && viewer ? eq(memberEvents.hostUserId, viewer.id) : undefined,
    input.includeDraft && viewer ? undefined : eq(memberEvents.status, "published"),
    input.includePast ? undefined : gte(memberEvents.startsAt, now),
    allowMembersOnly ? undefined : eq(memberEvents.visibility, "public"),
    !input.includeHostedByViewer && allowMembersOnly
      ? or(eq(memberEvents.visibility, "public"), eq(memberEvents.visibility, "members_only"))
      : undefined,
  );

  const rows = await getDb()
    .select({
      id: memberEvents.id,
      hostUserId: memberEvents.hostUserId,
      title: memberEvents.title,
      description: memberEvents.description,
      startsAt: memberEvents.startsAt,
      endsAt: memberEvents.endsAt,
      location: memberEvents.location,
      capacity: memberEvents.capacity,
      joinMode: memberEvents.joinMode,
      visibility: memberEvents.visibility,
      status: memberEvents.status,
      createdAt: memberEvents.createdAt,
      updatedAt: memberEvents.updatedAt,
      hostDisplayName: users.displayName,
      hostAvatarUrl: users.avatarUrl,
      hostRole: users.role,
    })
    .from(memberEvents)
    .innerJoin(users, eq(users.id, memberEvents.hostUserId))
    .where(whereClause)
    .orderBy(asc(memberEvents.startsAt), desc(memberEvents.createdAt))
    .limit(limit);

  const ids = rows.map((row) => row.id);
  const attendeeCounts =
    ids.length === 0
      ? []
      : await getDb()
          .select({
            eventId: memberEventAttendees.eventId,
            approvedCount: sql<number>`count(*) filter (where ${memberEventAttendees.status} = 'approved')::int`,
            requestedCount: sql<number>`count(*) filter (where ${memberEventAttendees.status} = 'requested')::int`,
            waitlistedCount: sql<number>`count(*) filter (where ${memberEventAttendees.status} = 'waitlisted')::int`,
          })
          .from(memberEventAttendees)
          .where(inArray(memberEventAttendees.eventId, ids))
          .groupBy(memberEventAttendees.eventId);

  const viewerStatuses =
    ids.length === 0 || !viewer
      ? []
      : await getDb()
          .select({
            eventId: memberEventAttendees.eventId,
            status: memberEventAttendees.status,
          })
          .from(memberEventAttendees)
          .where(and(inArray(memberEventAttendees.eventId, ids), eq(memberEventAttendees.userId, viewer.id)));

  const countsByEvent = new Map(attendeeCounts.map((row) => [row.eventId, row]));
  const viewerByEvent = new Map(viewerStatuses.map((row) => [row.eventId, row.status]));

  return rows.map((row) => {
    const counts = countsByEvent.get(row.id);
    return {
      ...row,
      counts: {
        approved: counts?.approvedCount ?? 0,
        requested: counts?.requestedCount ?? 0,
        waitlisted: counts?.waitlistedCount ?? 0,
      },
      viewerStatus: viewerByEvent.get(row.id) ?? null,
      canManage: viewer ? viewer.id === row.hostUserId || isAdminRole(viewer.role) : false,
    };
  });
}

export async function getMemberEventDetail(input: {
  eventId: number;
  viewerUserId?: number;
}) {
  const viewer = input.viewerUserId ? await getActor(input.viewerUserId).catch(() => null) : null;

  const [event] = await getDb()
    .select({
      id: memberEvents.id,
      hostUserId: memberEvents.hostUserId,
      title: memberEvents.title,
      description: memberEvents.description,
      startsAt: memberEvents.startsAt,
      endsAt: memberEvents.endsAt,
      location: memberEvents.location,
      capacity: memberEvents.capacity,
      joinMode: memberEvents.joinMode,
      visibility: memberEvents.visibility,
      status: memberEvents.status,
      createdAt: memberEvents.createdAt,
      updatedAt: memberEvents.updatedAt,
      hostDisplayName: users.displayName,
      hostAvatarUrl: users.avatarUrl,
      hostRole: users.role,
      hostCity: users.city,
    })
    .from(memberEvents)
    .innerJoin(users, eq(users.id, memberEvents.hostUserId))
    .where(eq(memberEvents.id, input.eventId))
    .limit(1);

  if (!event) {
    fail(404, "EVENT_NOT_FOUND", "Member event not found");
  }

  const canManage = viewer ? viewer.id === event.hostUserId || isAdminRole(viewer.role) : false;

  if (event.visibility === "members_only" && !viewer && !canManage) {
    fail(403, "MEMBERS_ONLY_EVENT", "This member event is visible to logged-in members only");
  }

  if (event.status === "draft" && !canManage) {
    fail(404, "EVENT_NOT_FOUND", "Member event not found");
  }

  const attendees = await getDb()
    .select({
      id: memberEventAttendees.id,
      userId: memberEventAttendees.userId,
      status: memberEventAttendees.status,
      requestedAt: memberEventAttendees.requestedAt,
      respondedAt: memberEventAttendees.respondedAt,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      city: users.city,
    })
    .from(memberEventAttendees)
    .innerJoin(users, eq(users.id, memberEventAttendees.userId))
    .where(eq(memberEventAttendees.eventId, event.id))
    .orderBy(asc(memberEventAttendees.requestedAt), asc(memberEventAttendees.id));

  const [viewerAttendee] =
    viewer
      ? await getDb()
          .select({
            id: memberEventAttendees.id,
            status: memberEventAttendees.status,
          })
          .from(memberEventAttendees)
          .where(and(eq(memberEventAttendees.eventId, event.id), eq(memberEventAttendees.userId, viewer.id)))
          .limit(1)
      : [];

  const comments = await getDb()
    .select({
      id: memberEventComments.id,
      userId: memberEventComments.userId,
      body: memberEventComments.body,
      createdAt: memberEventComments.createdAt,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(memberEventComments)
    .innerJoin(users, eq(users.id, memberEventComments.userId))
    .where(eq(memberEventComments.eventId, event.id))
    .orderBy(asc(memberEventComments.createdAt), asc(memberEventComments.id))
    .limit(200);

  const hostStats = await getMemberHostStats({
    userId: event.hostUserId,
  });

  return {
    event,
    attendees,
    viewerAttendee: viewerAttendee ?? null,
    canManage,
    comments,
    hostStats,
  };
}

export async function updateMemberEvent(input: {
  actorUserId: number;
  eventId: number;
  title?: string;
  description?: string;
  startsAt?: Date;
  endsAt?: Date | null;
  location?: string;
  capacity?: number | null;
  joinMode?: MemberEventJoinMode;
  visibility?: MemberEventVisibility;
  status?: MemberEventStatus;
}) {
  return getDb().transaction(async (tx) => {
    const actor = await getActor(input.actorUserId);
    const event = await loadEventForWrite(tx, input.eventId);
    if (!event) {
      fail(404, "EVENT_NOT_FOUND", "Member event not found");
    }

    const canManage = event.hostUserId === actor.id || isAdminRole(actor.role);
    if (!canManage) {
      fail(403, "FORBIDDEN_EVENT_MANAGE", "Only the host or admin can update this event");
    }

    const nextStatus = input.status ?? event.status;
    if (!isAdminRole(actor.role) && event.hostUserId !== actor.id && nextStatus === "cancelled") {
      fail(403, "FORBIDDEN_CANCEL", "Only host/admin can cancel this event");
    }

    const [updated] = await tx
      .update(memberEvents)
      .set({
        title: input.title === undefined ? event.title : clean(input.title),
        description: input.description === undefined ? event.description : clean(input.description),
        startsAt: input.startsAt ?? event.startsAt,
        endsAt: input.endsAt === undefined ? event.endsAt : input.endsAt,
        location: input.location === undefined ? event.location : clean(input.location),
        capacity: input.capacity === undefined ? event.capacity : input.capacity,
        joinMode: input.joinMode ?? event.joinMode,
        visibility: input.visibility ?? event.visibility,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(memberEvents.id, event.id))
      .returning();

    await logEventActivity({
      tx,
      eventId: event.id,
      actorUserId: actor.id,
      action: "event.updated",
      payload: {
        status: updated.status,
      },
    });

    await logAudit({
      tx,
      actorUserId: actor.id,
      action: "member_event.updated",
      targetId: String(event.id),
      payload: {
        status: updated.status,
      },
    });

    return updated;
  });
}

export async function joinMemberEvent(input: {
  actorUserId: number;
  eventId: number;
  ipAddress?: string;
}) {
  const actor = await getActor(input.actorUserId);

  const ip = input.ipAddress ?? "unknown";
  if (!allowWithinWindow(`member-event-join:${actor.id}:${input.eventId}:${ip}`, 20, 60_000)) {
    fail(429, "RATE_LIMITED", "Too many join attempts. Please wait and retry.");
  }

  return getDb().transaction(async (tx) => {
    const event = await loadEventForWrite(tx, input.eventId);
    if (!event) {
      fail(404, "EVENT_NOT_FOUND", "Member event not found");
    }
    if (event.status !== "published") {
      fail(409, "EVENT_NOT_JOINABLE", "This event is not open for joining");
    }
    if (event.hostUserId === actor.id) {
      fail(409, "HOST_CANNOT_JOIN", "Hosts do not join their own events");
    }

    const [existing] = await tx
      .select({
        id: memberEventAttendees.id,
        status: memberEventAttendees.status,
      })
      .from(memberEventAttendees)
      .where(and(eq(memberEventAttendees.eventId, event.id), eq(memberEventAttendees.userId, actor.id)))
      .limit(1);

    if (existing && inArrayLiteral(existing.status, ["requested", "approved", "waitlisted"])) {
      fail(409, "ALREADY_JOINED", "You have already joined this event");
    }

    const approvedCount = await getApprovedAttendeeCount(tx, event.id);
    const atCapacity = event.capacity !== null && approvedCount >= event.capacity;
    const nextStatus = resolveMemberEventJoinStatus({
      joinMode: event.joinMode,
      atCapacity,
    });
    const now = new Date();

    const [attendee] = existing
      ? await tx
          .update(memberEventAttendees)
          .set({
            status: nextStatus,
            requestedAt: now,
            respondedAt: nextStatus === "requested" ? null : now,
            updatedAt: now,
          })
          .where(eq(memberEventAttendees.id, existing.id))
          .returning({
            id: memberEventAttendees.id,
            eventId: memberEventAttendees.eventId,
            userId: memberEventAttendees.userId,
            status: memberEventAttendees.status,
            requestedAt: memberEventAttendees.requestedAt,
            respondedAt: memberEventAttendees.respondedAt,
          })
      : await tx
          .insert(memberEventAttendees)
          .values({
            eventId: event.id,
            userId: actor.id,
            status: nextStatus,
            requestedAt: now,
            respondedAt: nextStatus === "requested" ? null : now,
            createdAt: now,
            updatedAt: now,
          })
          .returning({
            id: memberEventAttendees.id,
            eventId: memberEventAttendees.eventId,
            userId: memberEventAttendees.userId,
            status: memberEventAttendees.status,
            requestedAt: memberEventAttendees.requestedAt,
            respondedAt: memberEventAttendees.respondedAt,
          });

    await logEventActivity({
      tx,
      eventId: event.id,
      actorUserId: actor.id,
      attendeeId: attendee.id,
      action: `attendee.${attendee.status}`,
      payload: {
        joinMode: event.joinMode,
      },
    });

    await logAudit({
      tx,
      actorUserId: actor.id,
      action: "member_event.join",
      targetId: String(event.id),
      payload: {
        attendeeId: attendee.id,
        status: attendee.status,
      },
    });

    if (attendee.status === "requested") {
      await createJoinRequestInboxThread({
        tx,
        event: {
          id: event.id,
          hostUserId: event.hostUserId,
          title: event.title,
        },
        attendee: {
          id: attendee.id,
          userId: attendee.userId,
        },
        actor,
      });
    }

    return {
      attendee,
      event: {
        id: event.id,
        title: event.title,
      },
    };
  });
}

function inArrayLiteral<T extends string>(value: T, values: readonly T[]) {
  return values.includes(value);
}

export async function approveMemberEventRequest(input: {
  actorUserId: number;
  eventId: number;
  requestId: number;
}) {
  return getDb().transaction(async (tx) => {
    const actor = await getActor(input.actorUserId);
    const event = await loadEventForWrite(tx, input.eventId);
    if (!event) {
      fail(404, "EVENT_NOT_FOUND", "Member event not found");
    }
    if (event.hostUserId !== actor.id && !isAdminRole(actor.role)) {
      fail(403, "FORBIDDEN_APPROVE", "Only the event host or admin can approve requests");
    }

    const [attendee] = await tx
      .select({
        id: memberEventAttendees.id,
        userId: memberEventAttendees.userId,
        status: memberEventAttendees.status,
      })
      .from(memberEventAttendees)
      .where(and(eq(memberEventAttendees.id, input.requestId), eq(memberEventAttendees.eventId, event.id)))
      .limit(1);
    if (!attendee) {
      fail(404, "REQUEST_NOT_FOUND", "Join request not found");
    }
    if (!inArrayLiteral(attendee.status, ["requested", "waitlisted"])) {
      fail(409, "REQUEST_NOT_PENDING", "This request cannot be approved");
    }

    const approvedCount = await getApprovedAttendeeCount(tx, event.id);
    const atCapacity = event.capacity !== null && approvedCount >= event.capacity;
    const nextStatus: MemberEventAttendeeStatus = atCapacity ? "waitlisted" : "approved";
    const now = new Date();

    const [updated] = await tx
      .update(memberEventAttendees)
      .set({
        status: nextStatus,
        respondedAt: now,
        updatedAt: now,
      })
      .where(eq(memberEventAttendees.id, attendee.id))
      .returning({
        id: memberEventAttendees.id,
        userId: memberEventAttendees.userId,
        status: memberEventAttendees.status,
      });

    await logEventActivity({
      tx,
      eventId: event.id,
      actorUserId: actor.id,
      attendeeId: updated.id,
      action: `request.${updated.status === "approved" ? "approved" : "waitlisted"}`,
      payload: {},
    });
    await logAudit({
      tx,
      actorUserId: actor.id,
      action: "member_event.request.approved",
      targetId: String(event.id),
      payload: {
        requestId: updated.id,
        status: updated.status,
      },
    });

    return updated;
  });
}

export async function rejectMemberEventRequest(input: {
  actorUserId: number;
  eventId: number;
  requestId: number;
}) {
  return getDb().transaction(async (tx) => {
    const actor = await getActor(input.actorUserId);
    const event = await loadEventForWrite(tx, input.eventId);
    if (!event) {
      fail(404, "EVENT_NOT_FOUND", "Member event not found");
    }
    if (event.hostUserId !== actor.id && !isAdminRole(actor.role)) {
      fail(403, "FORBIDDEN_REJECT", "Only the event host or admin can reject requests");
    }

    const [attendee] = await tx
      .select({
        id: memberEventAttendees.id,
        status: memberEventAttendees.status,
      })
      .from(memberEventAttendees)
      .where(and(eq(memberEventAttendees.id, input.requestId), eq(memberEventAttendees.eventId, event.id)))
      .limit(1);
    if (!attendee) {
      fail(404, "REQUEST_NOT_FOUND", "Join request not found");
    }
    if (!inArrayLiteral(attendee.status, ["requested", "waitlisted"])) {
      fail(409, "REQUEST_NOT_PENDING", "This request cannot be rejected");
    }

    const now = new Date();
    const [updated] = await tx
      .update(memberEventAttendees)
      .set({
        status: "rejected",
        respondedAt: now,
        updatedAt: now,
      })
      .where(eq(memberEventAttendees.id, attendee.id))
      .returning({
        id: memberEventAttendees.id,
        status: memberEventAttendees.status,
      });

    await logEventActivity({
      tx,
      eventId: event.id,
      actorUserId: actor.id,
      attendeeId: updated.id,
      action: "request.rejected",
      payload: {},
    });
    await logAudit({
      tx,
      actorUserId: actor.id,
      action: "member_event.request.rejected",
      targetId: String(event.id),
      payload: {
        requestId: updated.id,
      },
    });

    return updated;
  });
}

export async function cancelMemberEvent(input: {
  actorUserId: number;
  eventId: number;
}) {
  return getDb().transaction(async (tx) => {
    const actor = await getActor(input.actorUserId);
    const event = await loadEventForWrite(tx, input.eventId);
    if (!event) {
      fail(404, "EVENT_NOT_FOUND", "Member event not found");
    }
    if (event.hostUserId !== actor.id && !isAdminRole(actor.role)) {
      fail(403, "FORBIDDEN_CANCEL", "Only the event host or admin can cancel this event");
    }
    if (event.status === "cancelled") {
      return {
        id: event.id,
        status: event.status,
        alreadyCancelled: true,
      };
    }

    const now = new Date();
    const [updated] = await tx
      .update(memberEvents)
      .set({
        status: "cancelled",
        updatedAt: now,
      })
      .where(eq(memberEvents.id, event.id))
      .returning({
        id: memberEvents.id,
        status: memberEvents.status,
      });

    await tx
      .update(memberEventAttendees)
      .set({
        status: "cancelled",
        respondedAt: now,
        updatedAt: now,
      })
      .where(and(eq(memberEventAttendees.eventId, event.id), inArray(memberEventAttendees.status, ["requested", "approved", "waitlisted"])));

    await logEventActivity({
      tx,
      eventId: event.id,
      actorUserId: actor.id,
      action: "event.cancelled",
      payload: {},
    });
    await logAudit({
      tx,
      actorUserId: actor.id,
      action: "member_event.cancelled",
      targetId: String(event.id),
      payload: {},
    });

    return {
      ...updated,
      alreadyCancelled: false,
    };
  });
}

export async function createMemberEventComment(input: {
  actorUserId: number;
  eventId: number;
  body: string;
}) {
  const actor = await getActor(input.actorUserId);
  const text = clean(input.body);
  if (!text) {
    fail(400, "COMMENT_REQUIRED", "Comment body is required");
  }
  if (text.length > 800) {
    fail(400, "COMMENT_TOO_LONG", "Comment is too long");
  }

  const [event] = await getDb()
    .select({
      id: memberEvents.id,
      status: memberEvents.status,
      visibility: memberEvents.visibility,
    })
    .from(memberEvents)
    .where(eq(memberEvents.id, input.eventId))
    .limit(1);
  if (!event) {
    fail(404, "EVENT_NOT_FOUND", "Member event not found");
  }
  if (event.status !== "published") {
    fail(409, "EVENT_NOT_COMMENTABLE", "Only published events can be commented");
  }

  const now = new Date();
  const [comment] = await getDb()
    .insert(memberEventComments)
    .values({
      eventId: event.id,
      userId: actor.id,
      body: text,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: memberEventComments.id,
      eventId: memberEventComments.eventId,
      userId: memberEventComments.userId,
      body: memberEventComments.body,
      createdAt: memberEventComments.createdAt,
    });

  await getDb().insert(memberEventActivityLog).values({
    eventId: event.id,
    actorUserId: actor.id,
    attendeeId: null,
    action: "comment.created",
    payloadJson: {
      commentId: comment.id,
    },
    createdAt: now,
  });

  return comment;
}

export async function getMemberHostStats(input: { userId: number }) {
  const now = new Date();
  const [eventsHosted] = await getDb()
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(memberEvents)
    .where(eq(memberEvents.hostUserId, input.userId));

  const [upcomingHosted] = await getDb()
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(memberEvents)
    .where(and(eq(memberEvents.hostUserId, input.userId), eq(memberEvents.status, "published"), gte(memberEvents.startsAt, now)));

  const [approvedCounts] = await getDb()
    .select({
      approvedAttendeesTotal: sql<number>`count(*)::int`,
      uniqueAttendeesCount: sql<number>`count(distinct ${memberEventAttendees.userId})::int`,
    })
    .from(memberEventAttendees)
    .innerJoin(memberEvents, eq(memberEvents.id, memberEventAttendees.eventId))
    .where(and(eq(memberEvents.hostUserId, input.userId), eq(memberEventAttendees.status, "approved")));

  const [capacityRow] = await getDb()
    .select({
      capacityTotal: sql<number>`coalesce(sum(case when ${memberEvents.capacity} is null then 0 else ${memberEvents.capacity} end),0)::int`,
    })
    .from(memberEvents)
    .where(eq(memberEvents.hostUserId, input.userId));

  const approvedAttendeesTotal = approvedCounts?.approvedAttendeesTotal ?? 0;
  const uniqueAttendeesCount = approvedCounts?.uniqueAttendeesCount ?? 0;
  const capacityTotal = capacityRow?.capacityTotal ?? 0;
  const attendanceRate = calculateAttendanceRate({
    approvedAttendeesTotal,
    capacityTotal,
  });

  return {
    eventsHostedCount: eventsHosted?.count ?? 0,
    approvedAttendeesTotal,
    uniqueAttendeesCount,
    upcomingHostedCount: upcomingHosted?.count ?? 0,
    attendanceRate,
  };
}
