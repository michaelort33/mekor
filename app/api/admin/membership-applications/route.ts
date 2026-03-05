import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminActor } from "@/lib/admin/actor";
import { listMembershipApplications } from "@/lib/membership/application-service";

const statusSchema = z.enum(["pending", "approved", "declined"]);

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const parsedStatus = statusSchema.safeParse(searchParams.get("status")?.trim() ?? "");
  const items = await listMembershipApplications({
    q,
    status: parsedStatus.success ? parsedStatus.data : "",
  });

  return NextResponse.json({ items });
}
