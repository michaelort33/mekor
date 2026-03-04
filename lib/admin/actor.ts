import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { adminAuditLog, users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";

export type AdminActor = {
  id: number;
  email: string;
  role: "visitor" | "member" | "admin" | "super_admin";
};

export function isAdminLevelRole(role: AdminActor["role"]) {
  return role === "admin" || role === "super_admin";
}

async function maybeBootstrapSuperAdmin(actor: AdminActor): Promise<AdminActor> {
  const bootstrapEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!bootstrapEmail || actor.email.toLowerCase() !== bootstrapEmail || actor.role === "super_admin") {
    return actor;
  }

  const [upgraded] = await getDb()
    .update(users)
    .set({
      role: "super_admin",
      updatedAt: new Date(),
    })
    .where(eq(users.id, actor.id))
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
    });

  return upgraded ?? actor;
}

export async function requireAdminActor() {
  const userSession = await getUserSession();
  if (!userSession) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const [actorFromDb] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userSession.userId))
    .limit(1);

  if (!actorFromDb) {
    return { error: NextResponse.json({ error: "Admin user not found" }, { status: 403 }) } as const;
  }

  const actor = await maybeBootstrapSuperAdmin(actorFromDb);
  if (!isAdminLevelRole(actor.role)) {
    return {
      error: NextResponse.json({ error: "Only admin or super admin user accounts can access this." }, { status: 403 }),
    } as const;
  }

  return { actor } as const;
}

export async function requireSuperAdminActor() {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) {
    return adminResult;
  }

  if (adminResult.actor.role !== "super_admin") {
    return {
      error: NextResponse.json({ error: "Forbidden - Super admin access required" }, { status: 403 }),
    } as const;
  }

  return adminResult;
}

export async function writeAdminAuditLog(input: {
  actorUserId: number;
  action: string;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown>;
}) {
  await getDb().insert(adminAuditLog).values({
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    payloadJson: input.payload,
  });
}
