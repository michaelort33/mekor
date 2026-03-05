import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { hashPasswordResetToken } from "@/lib/auth/password-reset";
import { passwordResetCompletePayloadSchema } from "@/lib/users/validation";

type PasswordResetCompleteDependencies = {
  findResetTokenByHash: (tokenHash: string) => Promise<
    | {
        id: number;
        userId: number;
        expiresAt: Date;
        usedAt: Date | null;
      }
    | undefined
  >;
  hashPassword: (password: string) => Promise<string>;
  applyPasswordReset: (input: { userId: number; passwordHash: string; now: Date }) => Promise<void>;
};

type PasswordResetCompleteExecutionResult = {
  status: number;
  body:
    | { ok: true }
    | { error: string; issues?: unknown };
};

function createPasswordResetCompleteDependencies(): PasswordResetCompleteDependencies {
  const db = getDb();
  return {
    findResetTokenByHash: async (tokenHash) => {
      const [row] = await db
        .select({
          id: passwordResetTokens.id,
          userId: passwordResetTokens.userId,
          expiresAt: passwordResetTokens.expiresAt,
          usedAt: passwordResetTokens.usedAt,
        })
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, tokenHash))
        .limit(1);
      return row;
    },
    hashPassword,
    applyPasswordReset: async (input) => {
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            passwordHash: input.passwordHash,
            updatedAt: input.now,
          })
          .where(eq(users.id, input.userId));

        await tx
          .update(passwordResetTokens)
          .set({ usedAt: input.now })
          .where(and(eq(passwordResetTokens.userId, input.userId), isNull(passwordResetTokens.usedAt)));
      });
    },
  };
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

export async function executePasswordResetComplete(
  payload: unknown,
  dependencies: PasswordResetCompleteDependencies,
): Promise<PasswordResetCompleteExecutionResult> {
  const parsed = passwordResetCompletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
    };
  }

  const now = new Date();
  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const resetToken = await dependencies.findResetTokenByHash(tokenHash);

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= now.getTime()) {
    return {
      status: 400,
      body: { error: "Reset link is invalid or has expired" },
    };
  }

  const newPasswordHash = await dependencies.hashPassword(parsed.data.password);
  await dependencies.applyPasswordReset({
    userId: resetToken.userId,
    passwordHash: newPasswordHash,
    now,
  });

  return {
    status: 200,
    body: { ok: true },
  };
}

export async function POST(request: Request) {
  try {
    const result = await executePasswordResetComplete(await request.json().catch(() => ({})), createPasswordResetCompleteDependencies());
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json(
        { error: "Database schema is not initialized. Run the latest database migration." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Unable to reset password right now" }, { status: 500 });
  }
}
