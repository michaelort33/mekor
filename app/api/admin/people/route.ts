import { and, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import {
  communicationPreferences,
  contactMethods,
  duesInvoices,
  membershipPipelineEvents,
  people,
  userInvitations,
  users,
} from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { decodeCursor, parsePageLimit, toPaginatedResult } from "@/lib/pagination/cursor";
import { normalizeUserEmail } from "@/lib/users/validation";

const PEOPLE_STATUSES = ["lead", "invited", "visitor", "guest", "member", "admin", "super_admin", "inactive"] as const;

const peopleCursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.number().int().min(1),
});

const createPersonSchema = z.object({
  status: z.enum(PEOPLE_STATUSES).default("lead"),
  firstName: z.string().trim().max(120).default(""),
  lastName: z.string().trim().max(120).default(""),
  displayName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(60).default(""),
  city: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(4000).default(""),
  source: z.string().trim().max(120).default("admin"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const tag = searchParams.get("tag")?.trim() ?? "";
  const invited = searchParams.get("invited")?.trim() ?? "";
  const dues = searchParams.get("dues")?.trim() ?? "";
  const limit = parsePageLimit(searchParams.get("limit"));
  const parsedCursor = decodeCursor(searchParams.get("cursor"), peopleCursorSchema);
  if (parsedCursor.error) {
    return NextResponse.json({ error: parsedCursor.error }, { status: 400 });
  }
  const cursor = parsedCursor.value;

  const activeInviteExists = sql<boolean>`exists (
    select 1 from user_invitations ui
    where ui.email = ${people.email}
      and ui.accepted_at is null
      and ui.revoked_at is null
      and ui.expires_at > now()
  )`;

  const overdueDuesExists = sql<boolean>`exists (
    select 1 from dues_invoices di
    where di.user_id = ${people.userId}
      and di.status = 'overdue'
  )`;

  const openDuesExists = sql<boolean>`exists (
    select 1 from dues_invoices di
    where di.user_id = ${people.userId}
      and di.status in ('open', 'overdue')
  )`;

  const whereClause = and(
    q
      ? or(
          ilike(people.displayName, `%${q}%`),
          ilike(people.email, `%${q}%`),
          ilike(people.phone, `%${q}%`),
          ilike(people.notes, `%${q}%`),
        )
      : undefined,
    PEOPLE_STATUSES.includes(status as (typeof PEOPLE_STATUSES)[number])
      ? eq(people.status, status as (typeof PEOPLE_STATUSES)[number])
      : undefined,
    tag ? sql`${people.tags}::jsonb ? ${tag}` : undefined,
    invited === "yes"
      ? or(eq(people.status, "invited"), activeInviteExists)
      : invited === "no"
        ? and(sql`not ${activeInviteExists}`, sql`${people.status} <> 'invited'`)
        : undefined,
    dues === "overdue" ? overdueDuesExists : dues === "open" ? openDuesExists : undefined,
    cursor
      ? or(
          lt(people.createdAt, new Date(cursor.createdAt)),
          and(eq(people.createdAt, new Date(cursor.createdAt)), lt(people.id, cursor.id)),
        )
      : undefined,
  );

  const rows = await getDb()
    .select({
      id: people.id,
      userId: people.userId,
      status: people.status,
      firstName: people.firstName,
      lastName: people.lastName,
      displayName: people.displayName,
      email: people.email,
      phone: people.phone,
      city: people.city,
      notes: people.notes,
      source: people.source,
      tags: people.tags,
      invitedAt: people.invitedAt,
      joinedAt: people.joinedAt,
      lastContactedAt: people.lastContactedAt,
      createdAt: people.createdAt,
      updatedAt: people.updatedAt,
      role: users.role,
      emailOptIn: communicationPreferences.emailOptIn,
      smsOptIn: communicationPreferences.smsOptIn,
      whatsappOptIn: communicationPreferences.whatsappOptIn,
      doNotContact: communicationPreferences.doNotContact,
    })
    .from(people)
    .leftJoin(users, eq(users.id, people.userId))
    .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
    .where(whereClause)
    .orderBy(desc(people.createdAt), desc(people.id))
    .limit(limit + 1);

  const { items: pageRows, pageInfo } = toPaginatedResult(rows, limit, (row) => ({
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  }));

  const userIds = pageRows.map((row) => row.userId).filter((value): value is number => Number.isInteger(value));
  const outstandingRows =
    userIds.length === 0
      ? []
      : await getDb()
          .select({
            userId: duesInvoices.userId,
            outstandingBalanceCents: sql<number>`COALESCE(SUM(${duesInvoices.amountCents}), 0)`,
          })
          .from(duesInvoices)
          .where(and(inArray(duesInvoices.userId, userIds), inArray(duesInvoices.status, ["open", "overdue"])))
          .groupBy(duesInvoices.userId);
  const outstandingByUser = new Map(outstandingRows.map((row) => [row.userId, Number(row.outstandingBalanceCents)]));

  const emails = pageRows.map((row) => row.email).filter((value) => value.length > 0);
  const invitationRows =
    emails.length === 0
      ? []
      : await getDb()
          .select({
            id: userInvitations.id,
            email: userInvitations.email,
            expiresAt: userInvitations.expiresAt,
            acceptedAt: userInvitations.acceptedAt,
            revokedAt: userInvitations.revokedAt,
            createdAt: userInvitations.createdAt,
          })
          .from(userInvitations)
          .where(inArray(userInvitations.email, emails))
          .orderBy(desc(userInvitations.createdAt), desc(userInvitations.id));

  const invitationByEmail = new Map<
    string,
    { invitationId: number; invitationStatus: "active" | "accepted" | "revoked" | "expired"; invitationCreatedAt: string }
  >();
  const now = Date.now();
  for (const row of invitationRows) {
    if (invitationByEmail.has(row.email)) continue;
    const invitationStatus = row.acceptedAt
      ? "accepted"
      : row.revokedAt
        ? "revoked"
        : row.expiresAt.getTime() > now
          ? "active"
          : "expired";
    invitationByEmail.set(row.email, {
      invitationId: row.id,
      invitationStatus,
      invitationCreatedAt: row.createdAt.toISOString(),
    });
  }

  return NextResponse.json({
    items: pageRows.map((row) => ({
      ...row,
      outstandingBalanceCents: row.userId ? outstandingByUser.get(row.userId) ?? 0 : 0,
      invitation: invitationByEmail.get(row.email) ?? null,
    })),
    pageInfo,
  });
}

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const parsed = createPersonSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  if ((parsed.data.status === "admin" || parsed.data.status === "super_admin") && actor.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can create admin-level records" }, { status: 403 });
  }

  const email = normalizeUserEmail(parsed.data.email);
  const now = new Date();

  const [existing] = await getDb()
    .select({ id: people.id })
    .from(people)
    .where(eq(people.email, email))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "A person with this email already exists" }, { status: 409 });
  }

  const [created] = await getDb()
    .insert(people)
    .values({
      userId: null,
      status: parsed.data.status,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      displayName: parsed.data.displayName,
      email,
      phone: parsed.data.phone,
      city: parsed.data.city,
      notes: parsed.data.notes,
      source: parsed.data.source,
      tags: parsed.data.tags,
      invitedAt: parsed.data.status === "invited" ? now : null,
      joinedAt: null,
      lastContactedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: people.id,
      status: people.status,
      email: people.email,
      displayName: people.displayName,
      createdAt: people.createdAt,
    });

  await getDb().insert(communicationPreferences).values({
    personId: created.id,
    emailOptIn: true,
    smsOptIn: false,
    whatsappOptIn: false,
    doNotContact: false,
    quietHoursStart: "",
    quietHoursEnd: "",
    preferredChannel: "email",
    createdAt: now,
    updatedAt: now,
  });

  await getDb().insert(contactMethods).values({
    personId: created.id,
    type: "email",
    value: email,
    isPrimary: true,
    verifiedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  if (parsed.data.phone) {
    await getDb().insert(contactMethods).values({
      personId: created.id,
      type: "phone",
      value: parsed.data.phone,
      isPrimary: true,
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  await getDb().insert(membershipPipelineEvents).values({
    personId: created.id,
    actorUserId: actor.id,
    eventType: parsed.data.status === "invited" ? "invited" : "lead_created",
    summary: parsed.data.status === "invited" ? "Person created as invited" : "Lead created in admin",
    payloadJson: {
      status: parsed.data.status,
      source: parsed.data.source,
      tags: parsed.data.tags,
    },
    occurredAt: now,
    createdAt: now,
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "people.created",
    targetType: "person",
    targetId: String(created.id),
    payload: {
      email: created.email,
      status: created.status,
    },
  });

  return NextResponse.json({
    person: created,
  });
}
