import { NextResponse } from "next/server";

import { getManagedEvents } from "@/lib/events/store";

export async function GET() {
  const events = await getManagedEvents();
  return NextResponse.json({ events }, { status: 200 });
}
