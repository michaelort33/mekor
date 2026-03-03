import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createUserSession } from "@/lib/auth/session";
import { normalizeUserEmail, signupPayloadSchema } from "@/lib/users/validation";

type UserRole = "visitor" | "member" | "admin" | "super_admin";

type SignupDependencies = {
  assertSessionConfigured: () => void;
  findUserByEmail: (email: string) => Promise<{ id: number } | undefined>;
  createUser: (input: { email: string; passwordHash: string; displayName: string; now: Date }) => Promise<
    | {
        id: number;
        email: string;
        displayName: string;
        role: UserRole;
      }
    | undefined
  >;
  hashPassword: (password: string) => Promise<string>;
  createSession: (input: { userId: number; role: UserRole }) => Promise<void>;
};

type SignupExecutionResult = {
  status: number;
  body:
    | { ok: true; user: { id: number; email: string; displayName: string; role: UserRole } }
    | { error: string; issues?: unknown };
};

function createSignupDependencies(): SignupDependencies {
  const db = getDb();
  return {
    assertSessionConfigured: () => {
      if (!process.env.USER_SESSION_SECRET) {
        throw new Error("USER_SESSION_SECRET is required");
      }
    },
    findUserByEmail: async (email) => {
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      return existing;
    },
    createUser: async (input) => {
      const [created] = await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
          displayName: input.displayName,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
        });
      return created;
    },
    hashPassword,
    createSession: createUserSession,
  };
}

export async function executeSignup(
  payload: unknown,
  dependencies: SignupDependencies,
): Promise<SignupExecutionResult> {
  const parsed = signupPayloadSchema.safeParse(payload);
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
  const existing = await dependencies.findUserByEmail(email);
  if (existing) {
    return {
      status: 409,
      body: { error: "Email already registered" },
    };
  }

  const passwordHash = await dependencies.hashPassword(parsed.data.password);
  const now = new Date();
  const created = await dependencies.createUser({
    email,
    passwordHash,
    displayName: parsed.data.displayName.trim(),
    now,
  });

  if (!created) {
    throw new Error("Signup failed");
  }

  await dependencies.createSession({
    userId: created.id,
    role: created.role,
  });

  return {
    status: 201,
    body: { ok: true, user: created },
  };
}

export async function POST(request: Request) {
  try {
    const result = await executeSignup(await request.json(), createSignupDependencies());
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("relation") && message.includes("does not exist")) {
      return NextResponse.json(
        { error: "Database schema is not initialized. Run the latest database migration." },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: "Unable to sign up right now" }, { status: 500 });
  }
}
