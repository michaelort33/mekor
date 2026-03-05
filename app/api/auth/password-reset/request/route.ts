import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiryFromNow,
  sendPasswordResetEmail,
} from "@/lib/auth/password-reset";
import { allowWithinWindow } from "@/lib/invitations/rate-limit";
import { normalizeUserEmail, passwordResetRequestPayloadSchema } from "@/lib/users/validation";

const SUCCESS_MESSAGE = "If an account exists for that email, a reset link has been sent.";

type PasswordResetRequestDependencies = {
  findUserByEmail: (email: string) => Promise<
    | {
        id: number;
        email: string;
        displayName: string;
      }
    | undefined
  >;
  invalidateActiveTokens: (userId: number, now: Date) => Promise<void>;
  createResetToken: (input: { userId: number; tokenHash: string; expiresAt: Date; now: Date }) => Promise<void>;
  sendResetEmail: (input: { toEmail: string; displayName: string; resetUrl: string; expiresAt: Date }) => Promise<void>;
};

type PasswordResetRequestExecutionResult = {
  status: number;
  body:
    | { ok: true; message: string }
    | { error: string; issues?: unknown };
};

function createPasswordResetRequestDependencies(): PasswordResetRequestDependencies {
  const db = getDb();
  return {
    findUserByEmail: async (email) => {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return user;
    },
    invalidateActiveTokens: async (userId, now) => {
      await db
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
    },
    createResetToken: async (input) => {
      await db.insert(passwordResetTokens).values({
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdAt: input.now,
      });
    },
    sendResetEmail: async (input) => {
      await sendPasswordResetEmail(input);
    },
  };
}

function resolveSiteOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function getErrorMessages(error: unknown) {
  const messages: string[] = [];
  let current: unknown = error;

  for (let index = 0; index < 4 && current instanceof Error; index += 1) {
    messages.push(current.message.toLowerCase());
    current = current.cause;
  }

  return messages.join(" ");
}

function isMissingRelationError(error: unknown) {
  const message = getErrorMessages(error);
  return message.includes("relation") && message.includes("does not exist");
}

export async function executePasswordResetRequest(
  payload: unknown,
  dependencies: PasswordResetRequestDependencies,
  siteOrigin: string,
): Promise<PasswordResetRequestExecutionResult> {
  const parsed = passwordResetRequestPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
    };
  }

  const email = normalizeUserEmail(parsed.data.email);
  const user = await dependencies.findUserByEmail(email);
  if (!user) {
    return {
      status: 200,
      body: { ok: true, message: SUCCESS_MESSAGE },
    };
  }

  const now = new Date();
  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = passwordResetExpiryFromNow();

  await dependencies.invalidateActiveTokens(user.id, now);
  await dependencies.createResetToken({
    userId: user.id,
    tokenHash,
    expiresAt,
    now,
  });
  await dependencies.sendResetEmail({
    toEmail: user.email,
    displayName: user.displayName,
    resetUrl: `${siteOrigin}/reset-password?token=${encodeURIComponent(rawToken)}`,
    expiresAt,
  });

  return {
    status: 200,
    body: { ok: true, message: SUCCESS_MESSAGE },
  };
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const parsed = passwordResetRequestPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const email = normalizeUserEmail(parsed.data.email);
  if (!allowWithinWindow(`password-reset-request:${ip}:${email}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many reset attempts. Please wait and retry." }, { status: 429 });
  }

  try {
    const result = await executePasswordResetRequest(
      parsed.data,
      createPasswordResetRequestDependencies(),
      resolveSiteOrigin(request),
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json(
        { error: "Database schema is not initialized. Run the latest database migration." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Unable to send reset email right now" }, { status: 500 });
  }
}
