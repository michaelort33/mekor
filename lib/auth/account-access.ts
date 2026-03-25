import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { membershipApplications, users } from "@/db/schema";
import { getUserSession, type UserSession, type UserSessionRole } from "@/lib/auth/session";

export type AccountAccessState = "approved_member" | "pending_approval" | "declined" | "visitor";
export type LinkedMembershipApplicationStatus = "pending" | "approved" | "declined" | null;

export type ResolvedAccountAccess = {
  role: UserSessionRole;
  accessState: AccountAccessState;
  latestMembershipApplicationStatus: LinkedMembershipApplicationStatus;
};

export type SessionAccountAccess = ResolvedAccountAccess & {
  session: UserSession;
};

export function canAccessMembersArea(input: {
  role?: UserSessionRole | null;
  accessState?: AccountAccessState | null;
}) {
  if (input.accessState === "approved_member") {
    return true;
  }

  return input.role === "member" || input.role === "admin" || input.role === "super_admin";
}

export async function resolveAccountAccess(userId: number): Promise<ResolvedAccountAccess | null> {
  const [user] = await getDb()
    .select({
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  if (user.role === "member" || user.role === "admin" || user.role === "super_admin") {
    return {
      role: user.role,
      accessState: "approved_member",
      latestMembershipApplicationStatus: "approved",
    };
  }

  const [latestApplication] = await getDb()
    .select({
      status: membershipApplications.status,
    })
    .from(membershipApplications)
    .where(eq(membershipApplications.submittedByUserId, userId))
    .orderBy(desc(membershipApplications.createdAt), desc(membershipApplications.id))
    .limit(1);

  if (!latestApplication) {
    return {
      role: user.role,
      accessState: "visitor",
      latestMembershipApplicationStatus: null,
    };
  }

  if (latestApplication.status === "pending") {
    return {
      role: user.role,
      accessState: "pending_approval",
      latestMembershipApplicationStatus: latestApplication.status,
    };
  }

  if (latestApplication.status === "declined") {
    return {
      role: user.role,
      accessState: "declined",
      latestMembershipApplicationStatus: latestApplication.status,
    };
  }

  return {
    role: user.role,
    accessState: "visitor",
    latestMembershipApplicationStatus: latestApplication.status,
  };
}

export async function getSessionAccountAccess(): Promise<SessionAccountAccess | null> {
  const session = await getUserSession();
  if (!session) {
    return null;
  }

  const resolved = await resolveAccountAccess(session.userId);
  if (!resolved) {
    return null;
  }

  return {
    session,
    ...resolved,
  };
}

export function membershipApprovalRequiredResponse() {
  return NextResponse.json(
    {
      error: "Membership approval is required to access this area.",
      code: "PENDING_MEMBERSHIP_APPROVAL",
    },
    { status: 403 },
  );
}

export async function requireAuthenticatedAccountAccess() {
  const access = await getSessionAccountAccess();
  if (!access) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  return access;
}

export async function requireApprovedMemberAccountAccess() {
  const access = await requireAuthenticatedAccountAccess();
  if ("error" in access) {
    return access;
  }

  if (!canAccessMembersArea(access)) {
    return { error: membershipApprovalRequiredResponse() } as const;
  }

  return access;
}
