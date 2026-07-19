import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import {
  isLocalAdminAutologinEnabled,
  resolveLocalAdminNextPath,
} from "@/lib/auth/local-admin-autologin";
import { createUserSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adminEmail = process.env.LOCAL_ADMIN_AUTOLOGIN_EMAIL;
  if (
    !isLocalAdminAutologinEnabled({
      hostname: url.hostname,
      nodeEnv: process.env.NODE_ENV,
      adminEmail,
    })
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [user] = await getDb()
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, adminEmail!.trim().toLowerCase()))
    .limit(1);

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Configured local autologin user is not an admin" }, { status: 403 });
  }

  await createUserSession({ userId: user.id, role: user.role });
  return NextResponse.redirect(
    new URL(resolveLocalAdminNextPath(url.searchParams.get("next")), request.url),
  );
}
