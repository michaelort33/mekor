import { NextResponse } from "next/server";

import { familyServiceErrorResponse, requireFamilyActor } from "@/lib/families/http";
import { listInboxThreads } from "@/lib/families/service";

export async function GET() {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;

  try {
    const items = await listInboxThreads(actorResult.actor.id);
    return NextResponse.json({ items });
  } catch (error) {
    return familyServiceErrorResponse(error);
  }
}
