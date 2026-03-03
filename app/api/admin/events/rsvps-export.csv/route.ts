import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { eventRsvps } from "@/db/schema";
import { ensureAdminApiSession } from "@/lib/admin/guard";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";

function csvEscape(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export async function GET(request: Request) {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await ensureAdminApiSession();
  if (auth) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const eventPath = searchParams.get("eventPath") ?? "";

  if (!eventPath) {
    return NextResponse.json({ error: "eventPath is required" }, { status: 400 });
  }

  const rows = await getDb()
    .select({
      eventPath: eventRsvps.eventPath,
      eventTitle: eventRsvps.eventTitle,
      name: eventRsvps.name,
      email: eventRsvps.email,
      phone: eventRsvps.phone,
      attendeeCount: eventRsvps.attendeeCount,
      note: eventRsvps.note,
      createdAt: eventRsvps.createdAt,
    })
    .from(eventRsvps)
    .where(eq(eventRsvps.eventPath, eventPath))
    .orderBy(asc(eventRsvps.createdAt));

  const lines = [
    "event_path,event_title,name,email,phone,attendee_count,note,created_at",
    ...rows.map((row) =>
      [
        csvEscape(row.eventPath),
        csvEscape(row.eventTitle),
        csvEscape(row.name),
        csvEscape(row.email),
        csvEscape(row.phone),
        csvEscape(row.attendeeCount),
        csvEscape(row.note),
        csvEscape(row.createdAt?.toISOString() ?? ""),
      ].join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsvps-${encodeURIComponent(eventPath)}.csv"`,
    },
  });
}
