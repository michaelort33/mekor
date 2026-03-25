import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApprovedMemberAccountAccess } from "@/lib/auth/account-access";
import { allowWithinWindow } from "@/lib/invitations/rate-limit";
import { memberEventsServiceErrorResponse } from "@/lib/member-events/http";
import { createMemberEvent, listMemberEvents } from "@/lib/member-events/service";

const createMemberEventSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(4000).optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional().nullable(),
    location: z.string().trim().max(255).optional(),
    capacity: z.number().int().min(1).max(2000).optional().nullable(),
    joinMode: z.enum(["open_join", "request_to_join"]),
    visibility: z.enum(["members_only", "public"]).default("members_only"),
    publishNow: z.boolean().optional(),
  })
  .refine((value) => {
    if (!value.endsAt) return true;
    return new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime();
  }, "Event end time must be after start time");

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const host = url.searchParams.get("host");
    const includeDraft = url.searchParams.get("includeDraft") === "1";
    const includePast = url.searchParams.get("includePast") === "1";
    const rawLimit = Number(url.searchParams.get("limit") ?? "40");
    const limit = Number.isInteger(rawLimit) ? rawLimit : 40;

    const access = await requireApprovedMemberAccountAccess();
    if ("error" in access) {
      return access.error;
    }

    const items = await listMemberEvents({
      viewerUserId: access.session.userId,
      includeHostedByViewer: host === "me",
      includeDraft: includeDraft && host === "me",
      includePast,
      limit,
    });

    return NextResponse.json({ items });
  } catch (error) {
    return memberEventsServiceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const access = await requireApprovedMemberAccountAccess();
  if ("error" in access) {
    return access.error;
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowWithinWindow(`member-event-create:${access.session.userId}:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many create attempts. Please wait and retry." }, { status: 429 });
  }

  const parsed = createMemberEventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await createMemberEvent({
      actorUserId: access.session.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      location: parsed.data.location,
      capacity: parsed.data.capacity ?? null,
      joinMode: parsed.data.joinMode,
      visibility: parsed.data.visibility,
      publishNow: parsed.data.publishNow,
    });
    return NextResponse.json({ event: created }, { status: 201 });
  } catch (error) {
    return memberEventsServiceErrorResponse(error);
  }
}
