import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import {
  AskMekorServiceError,
  createAskMekorQuestion,
  listPublicAskMekorQuestions,
} from "@/lib/ask-mekor/service";
import { getUserSession } from "@/lib/auth/session";

const createQuestionSchema = z.object({
  categorySlug: z.string().trim().min(1).max(80),
  visibility: z.enum(["public", "private"]),
  publicAnonymous: z.boolean().optional().default(false),
  title: z.string().trim().min(3).max(180),
  body: z.string().trim().min(8).max(8000),
  askerName: z.string().trim().min(1).max(120),
  askerEmail: z.string().trim().email().max(255),
  askerPhone: z.string().trim().max(60).optional().default(""),
  sourcePath: z.string().trim().max(512).optional().default("/ask-mekor"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await listPublicAskMekorQuestions({
      q: searchParams.get("q") ?? "",
      categorySlug: searchParams.get("category") ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load Ask Mekor questions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = createQuestionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const session = await getUserSession();
    let askerUserId: number | null = null;
    if (session) {
      const [user] = await getDb()
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);
      askerUserId = user?.id ?? null;
    }

    const created = await createAskMekorQuestion({
      ...parsed.data,
      askerUserId,
    });

    const redirectTo =
      created.visibility === "private"
        ? askerUserId
          ? `/account/inbox?thread=${created.linkedThreadId}`
          : "/ask-mekor?submitted=private"
        : `/ask-mekor/questions/${created.slug}`;

    return NextResponse.json(
      {
        ok: true,
        id: created.id,
        slug: created.slug,
        redirectTo,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to create Ask Mekor question" }, { status: 500 });
  }
}
