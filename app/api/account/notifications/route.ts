import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requireAuthenticatedAccountAccess } from "@/lib/auth/account-access";

const updateSchema = z.object({
  autoMessagesEnabled: z.boolean(),
});

export async function GET() {
  const access = await requireAuthenticatedAccountAccess();
  if ("error" in access) return access.error;

  const [row] = await getDb()
    .select({
      email: users.email,
      autoMessagesEnabled: users.autoMessagesEnabled,
    })
    .from(users)
    .where(eq(users.id, access.session.userId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ preferences: row });
}

export async function PUT(request: Request) {
  const access = await requireAuthenticatedAccountAccess();
  if ("error" in access) return access.error;

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [updated] = await getDb()
    .update(users)
    .set({
      autoMessagesEnabled: parsed.data.autoMessagesEnabled,
      updatedAt: new Date(),
    })
    .where(eq(users.id, access.session.userId))
    .returning({
      email: users.email,
      autoMessagesEnabled: users.autoMessagesEnabled,
    });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ preferences: updated });
}
