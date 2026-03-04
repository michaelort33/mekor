import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "Admin shared-password login has been removed. Sign in via /login with your user account." },
    { status: 410 },
  );
}
