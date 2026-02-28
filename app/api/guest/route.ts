import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { guests } from "@/db/schema";

const COOKIE_NAME = "guest_token";

const createGuestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
});

function getApiToken() {
  const apiToken = process.env.GUEST_API_TOKEN;
  if (!apiToken) {
    throw new Error("GUEST_API_TOKEN is required");
  }

  return apiToken;
}

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === getApiToken();
}

export async function GET() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guestList = await getDb()
    .select()
    .from(guests)
    .orderBy(desc(guests.createdAt), desc(guests.id));

  return NextResponse.json({ guests: guestList });
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createGuestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [inserted] = await getDb()
    .insert(guests)
    .values(parsed.data)
    .$returningId();

  if (!inserted) {
    throw new Error("Insert failed");
  }

  const [createdGuest] = await getDb()
    .select()
    .from(guests)
    .where(eq(guests.id, inserted.id))
    .limit(1);

  return NextResponse.json({ guest: createdGuest }, { status: 201 });
}
