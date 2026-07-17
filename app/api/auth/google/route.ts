import { randomBytes } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createUserSession } from "@/lib/auth/session";
import { acceptFamilyInviteByToken } from "@/lib/families/service";
import { ensurePersonForUser } from "@/lib/people/service";
import { normalizeUserEmail } from "@/lib/users/validation";

type UserRole = "visitor" | "member" | "admin" | "super_admin";

type GoogleIdentity = {
  subject: string;
  email: string;
  emailVerified: boolean;
  hostedDomain: string | null;
  displayName: string;
  pictureUrl: string;
};

type AuthenticatedUser = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  googleSubject: string | null;
};

export type GoogleLoginDependencies = {
  getClientId: () => string;
  verifyCredential: (credential: string, clientId: string) => Promise<GoogleIdentity>;
  findUserByGoogleSubject: (subject: string) => Promise<AuthenticatedUser | undefined>;
  findUserByEmail: (email: string) => Promise<AuthenticatedUser | undefined>;
  linkGoogleSubject: (userId: number, subject: string) => Promise<AuthenticatedUser | undefined>;
  createUser: (input: {
    email: string;
    googleSubject: string;
    passwordHash: string;
    displayName: string;
    pictureUrl: string;
  }) => Promise<AuthenticatedUser | undefined>;
  hashPassword: (password: string) => Promise<string>;
  markUserLoggedIn: (userId: number) => Promise<void>;
  ensurePersonForUser: (input: { userId: number; source: string; actorUserId: number }) => Promise<void>;
  createSession: (input: { userId: number; role: UserRole }) => Promise<void>;
  acceptFamilyInviteByToken: (input: { actorUserId: number; token: string; actorEmail: string }) => Promise<void>;
};

type GoogleLoginResult = {
  status: number;
  body:
    | { ok: true; user: { id: number; email: string; displayName: string; role: UserRole } }
    | { error: string; issues?: unknown };
};

const googleLoginPayloadSchema = z.object({
  credential: z.string().min(20),
  familyInviteToken: z.string().min(1).optional(),
});

function getGoogleClientId() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is required");
  }
  return clientId;
}

function isAuthoritativeGoogleEmail(identity: GoogleIdentity) {
  return identity.emailVerified && (identity.email.endsWith("@gmail.com") || Boolean(identity.hostedDomain));
}

function userSelection() {
  return {
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    googleSubject: users.googleSubject,
  };
}

function createGoogleLoginDependencies(): GoogleLoginDependencies {
  const db = getDb();
  const oauthClient = new OAuth2Client();

  return {
    getClientId: getGoogleClientId,
    verifyCredential: async (credential, clientId) => {
      const ticket = await oauthClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new Error("Google account email is not verified");
      }

      return {
        subject: payload.sub,
        email: normalizeUserEmail(payload.email),
        emailVerified: payload.email_verified,
        hostedDomain: payload.hd ?? null,
        displayName: payload.name?.trim() || payload.email.split("@")[0],
        pictureUrl: payload.picture ?? "",
      };
    },
    findUserByGoogleSubject: async (subject) => {
      const [user] = await db
        .select(userSelection())
        .from(users)
        .where(eq(users.googleSubject, subject))
        .limit(1);
      return user;
    },
    findUserByEmail: async (email) => {
      const [user] = await db.select(userSelection()).from(users).where(eq(users.email, email)).limit(1);
      return user;
    },
    linkGoogleSubject: async (userId, subject) => {
      const [user] = await db
        .update(users)
        .set({ googleSubject: subject, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.googleSubject)))
        .returning(userSelection());
      return user;
    },
    createUser: async (input) => {
      const [user] = await db
        .insert(users)
        .values({
          email: input.email,
          googleSubject: input.googleSubject,
          passwordHash: input.passwordHash,
          displayName: input.displayName,
          avatarUrl: input.pictureUrl,
          role: "visitor",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(userSelection());
      return user;
    },
    hashPassword,
    markUserLoggedIn: async (userId) => {
      await db
        .update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
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

export async function executeGoogleLogin(
  payload: unknown,
  dependencies: GoogleLoginDependencies,
): Promise<GoogleLoginResult> {
  const parsed = googleLoginPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: 400,
      body: { error: "Invalid payload", issues: parsed.error.flatten() },
    };
  }

  let clientId: string;
  try {
    clientId = dependencies.getClientId();
  } catch {
    return {
      status: 500,
      body: { error: "Google sign-in is not configured" },
    };
  }

  let identity: GoogleIdentity;
  try {
    identity = await dependencies.verifyCredential(parsed.data.credential, clientId);
  } catch {
    return {
      status: 401,
      body: { error: "Google sign-in could not be verified" },
    };
  }

  let user = await dependencies.findUserByGoogleSubject(identity.subject);
  if (!user) {
    const existingUser = await dependencies.findUserByEmail(identity.email);
    if (existingUser) {
      if (existingUser.googleSubject && existingUser.googleSubject !== identity.subject) {
        return {
          status: 409,
          body: { error: "This email is already linked to another Google account" },
        };
      }
      if (!isAuthoritativeGoogleEmail(identity)) {
        return {
          status: 409,
          body: { error: "Log in with your password before linking this Google account" },
        };
      }

      user = await dependencies.linkGoogleSubject(existingUser.id, identity.subject);
    } else {
      const generatedPassword = randomBytes(32).toString("base64url");
      const passwordHash = await dependencies.hashPassword(generatedPassword);
      user = await dependencies.createUser({
        email: identity.email,
        googleSubject: identity.subject,
        passwordHash,
        displayName: identity.displayName,
        pictureUrl: identity.pictureUrl,
      });
    }
  }

  if (!user) {
    throw new Error("Google sign-in account could not be created or linked");
  }

  await dependencies.markUserLoggedIn(user.id);
  await dependencies.ensurePersonForUser({
    userId: user.id,
    source: "google_login_sync",
    actorUserId: user.id,
  });
  await dependencies.createSession({ userId: user.id, role: user.role });

  if (parsed.data.familyInviteToken) {
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
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const result = await executeGoogleLogin(await request.json(), createGoogleLoginDependencies());
  return NextResponse.json(result.body, { status: result.status });
}
