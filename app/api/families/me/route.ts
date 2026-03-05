import { NextResponse } from "next/server";

import { familyServiceErrorResponse, requireFamilyActor } from "@/lib/families/http";
import { getMyFamilyOverview } from "@/lib/families/service";

export async function GET() {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;

  try {
    const overview = await getMyFamilyOverview(actorResult.actor.id);
    return NextResponse.json(overview);
  } catch (error) {
    return familyServiceErrorResponse(error);
  }
}
