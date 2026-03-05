import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createUserSession } from "@/lib/auth/session";
import { acceptFamilyInviteByToken } from "@/lib/families/service";
import { ensurePersonForUser } from "@/lib/people/service";
import { loginPayloadSchema, normalizeUserEmail } from "@/lib/users/validation";

type UserRole = "visitor" | "member" | "admin" | "super_admin";

type LoginDependencies = {
  assertSessionConfigured: () => void;
  findUserByEmail: (email: string) => Promise<
    | {
        id: number;
        email: string;
        displayName: string;
        role: UserRole;
        passwordHash: string;
      }
    | undefined
  >;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
  markUserLoggedIn: (userId: number) => Promise<void>;
  ensurePersonForUser?: (input: { userId: number; source?: string; actorUserId?: number | null }) => Promise<void>;
  createSession: (input: { userId: number; role: UserRole }) => Promise<void>;
  acceptFamilyInviteByToken?: (input: { actorUserId: number; token: string; actorEmail: string }) => Promise<void>;
};

type LoginExecutionResult = {
  status: number;
  body:
    | { ok: true; user: { id: number; email: string; displayName: string; role: UserRole } }
    | { error: string; issues?: unknown };
};

function createLoginDependencies(): LoginDependencies {
  const db = getDb();
  return {
    assertSessionConfigured: () => {
      if (!process.env.USER_SESSION_SECRET) {
        throw new Error("USER_SESSION_SECRET is required");
      }
    },
    findUserByEmail: async (email) => {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return user;
    },
    verifyPassword,
    markUserLoggedIn: async (userId) => {
      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    },
    ensurePersonForUser: async (input) => {
      await ensurePersonForUser(input);
    },
    createSession: createUserSession,
    acceptFamilyInviteByToken: async (input) => {
      await acceptFamilyInviteByToken(input);
    },
  };
}

export async function executeLogin(
  payload: unknown,
  dependencies: LoginDependencies,
): Promise<LoginExecutionResult> {
  const parsed = loginPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
    };
  }

  try {
    dependencies.assertSessionConfigured();
  } catch {
    return {
      status: 500,
      body: { error: "Auth session is not configured" },
    };
  }

  const email = normalizeUserEmail(parsed.data.email);
  const user = await dependencies.findUserByEmail(email);

  if (!user) {
    return {
      status: 401,
      body: { error: "Invalid email or password" },
    };
  }

  const valid = await dependencies.verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return {
      status: 401,
      body: { error: "Invalid email or password" },
    };
  }

  await dependencies.markUserLoggedIn(user.id);
  if (dependencies.ensurePersonForUser) {
    await dependencies.ensurePersonForUser({
      userId: user.id,
      source: "login_sync",
      actorUserId: user.id,
    });
  }

  await dependencies.createSession({
    userId: user.id,
    role: user.role,
  });

  if (parsed.data.familyInviteToken && dependencies.acceptFamilyInviteByToken) {
    try {
      await dependencies.acceptFamilyInviteByToken({
        actorUserId: user.id,
        token: parsed.data.familyInviteToken,
        actorEmail: user.email,
      });
    } catch {
      // Keep login successful even if invite token has expired or is invalid.
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    },
  };
}

export async function POST(request: Request) {
  const result = await executeLogin(await request.json(), createLoginDependencies());
  return NextResponse.json(result.body, { status: result.status });
}
