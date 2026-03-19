import { NextResponse } from "next/server";

import { AskMekorServiceError, listAdminAskMekorQuestions } from "@/lib/ask-mekor/service";
import { requireAdminActor } from "@/lib/admin/actor";

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const result = await listAdminAskMekorQuestions({
      q: searchParams.get("q") ?? "",
      visibility: (searchParams.get("visibility") as "public" | "private" | null) ?? undefined,
      status: (searchParams.get("status") as "open" | "answered" | "closed" | null) ?? undefined,
      categorySlug: searchParams.get("category") ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load admin Ask Mekor questions" }, { status: 500 });
  }
}
