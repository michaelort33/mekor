import { NextResponse } from "next/server";

import { AskMekorServiceError, getPublicAskMekorQuestionBySlug } from "@/lib/ask-mekor/service";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const slug = (await context.params).slug;
    const question = await getPublicAskMekorQuestionBySlug(slug);
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    return NextResponse.json(question);
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load Ask Mekor question" }, { status: 500 });
  }
}
