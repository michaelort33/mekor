import { NextResponse } from "next/server";

import { confirmNewsletterSubscription } from "@/lib/newsletter/subscriptions";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const result = token ? await confirmNewsletterSubscription(token) : { ok: false as const, reason: "invalid" as const };
  const destination = new URL("/newsletter/confirmed", url.origin);
  destination.searchParams.set("status", result.ok ? "confirmed" : result.reason);
  return NextResponse.redirect(destination);
}
