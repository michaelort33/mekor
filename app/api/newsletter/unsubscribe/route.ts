import { NextResponse } from "next/server";

import { unsubscribeNewsletter } from "@/lib/newsletter/subscriptions";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const result = token ? await unsubscribeNewsletter(token) : { ok: false };
  const destination = new URL("/newsletter/unsubscribed", url.origin);
  destination.searchParams.set("status", result.ok ? "unsubscribed" : "invalid");
  return NextResponse.redirect(destination, 303);
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) return new NextResponse(null, { status: 400 });
  const result = await unsubscribeNewsletter(token);
  return new NextResponse(null, { status: result.ok ? 204 : 404 });
}
