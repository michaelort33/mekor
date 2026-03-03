import { NextResponse } from "next/server";

import { destroyUserSession } from "@/lib/auth/session";

function redirectHome(request: Request) {
  const url = new URL("/", request.url);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  return redirectHome(request);
}

export async function POST(request: Request) {
  await destroyUserSession();
  return redirectHome(request);
}
