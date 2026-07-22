import { NextResponse } from "next/server";

import { requireAdminActor } from "@/lib/admin/actor";
import { listNewsletterAudiences } from "@/lib/newsletter/audiences";

export async function GET() {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  try {
    const audiences = await listNewsletterAudiences();
    return NextResponse.json({ audiences });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load audiences" },
      { status: 500 },
    );
  }
}
