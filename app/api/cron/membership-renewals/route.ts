import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { sendMembershipRenewalReminder, shouldSendRenewalReminder } from "@/lib/membership/renewal-messages";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  const dueRenewalDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const duesUrl = `${request.nextUrl.origin}/account/dues`;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      membershipRenewalDate: users.membershipRenewalDate,
    })
    .from(users)
    .where(
      and(
        eq(users.autoMessagesEnabled, true),
        inArray(users.role, ["member", "admin", "super_admin"]),
        eq(users.membershipRenewalDate, dueRenewalDate),
      ),
    );

  let sent = 0;
  let failed = 0;
  let deduped = 0;

  for (const row of rows) {
    if (!row.membershipRenewalDate) {
      continue;
    }

    const shouldSend = shouldSendRenewalReminder({
      renewalDate: new Date(`${row.membershipRenewalDate}T00:00:00.000Z`),
      now,
    });
    if (!shouldSend) {
      continue;
    }

    const result = await sendMembershipRenewalReminder({
      userId: row.id,
      userEmail: row.email,
      displayName: row.displayName,
      renewalDate: row.membershipRenewalDate,
      duesUrl,
    });

    if (result.deduped) {
      deduped += 1;
      continue;
    }

    if (result.sent) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    dueRenewalDate,
    candidates: rows.length,
    sent,
    failed,
    deduped,
  });
}
