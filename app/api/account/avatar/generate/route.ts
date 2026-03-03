import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";

const requestSchema = z.object({
  prompt: z.string().trim().min(3).max(180),
});

function assertAvatarGenerationConfigured() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required");
  }
}

function normalizeAvatarPrompt(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function isPromptAllowed(input: string) {
  const blocked = [
    "nude",
    "nudity",
    "sexual",
    "porn",
    "gore",
    "blood",
    "swastika",
    "hitler",
    "weapon",
    "racist",
    "hate",
  ];
  const value = input.toLowerCase();
  return !blocked.some((word) => value.includes(word));
}

function buildAvatarPrompt(userPrompt: string) {
  return [
    "Create a clean, friendly anime/cartoon portrait avatar.",
    "Square composition, head-and-shoulders framing, single person only.",
    "Soft, tasteful colors, plain or subtle gradient background.",
    "No text, no logos, no watermarks, no explicit content.",
    `User description: ${userPrompt}`,
  ].join(" ");
}

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid prompt", issues: parsed.error.flatten() }, { status: 400 });
  }

  const cleanPrompt = normalizeAvatarPrompt(parsed.data.prompt);
  if (!isPromptAllowed(cleanPrompt)) {
    return NextResponse.json({ error: "Prompt is not allowed. Please use a different description." }, { status: 400 });
  }

  try {
    assertAvatarGenerationConfigured();

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt: buildAvatarPrompt(cleanPrompt),
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
    });

    const imageBase64 = result.data?.[0]?.b64_json;
    if (!imageBase64) {
      return NextResponse.json({ error: "Avatar generation failed" }, { status: 502 });
    }

    const imageBytes = Buffer.from(imageBase64, "base64");
    const blob = await put(`avatars/user-${session.userId}/${Date.now()}-ai.png`, imageBytes, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: true,
    });

    const [updated] = await getDb()
      .update(users)
      .set({
        avatarUrl: blob.url,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId))
      .returning({ avatarUrl: users.avatarUrl });

    return NextResponse.json({ avatarUrl: updated?.avatarUrl ?? blob.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate avatar";
    if (message.includes("required")) {
      return NextResponse.json({ error: "Avatar generation is not configured" }, { status: 500 });
    }
    return NextResponse.json({ error: "Unable to generate avatar" }, { status: 500 });
  }
}
