import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(newsletterTemplates)
    .orderBy(desc(newsletterTemplates.updatedAt));

  return NextResponse.json({ templates: rows });
}

export async function POST(request: Request) {
  const body = await request.json();
  const db = getDb();

  const [row] = await db
    .insert(newsletterTemplates)
    .values({
      title: body.title || "Untitled Template",
      subject: body.subject || "",
      parshaName: body.parshaName || "",
      shabbatDate: body.shabbatDate || "",
      hebrewDate: body.hebrewDate || "",
      candleLighting: body.candleLighting || "",
      bodyHtml: body.bodyHtml || "",
      status: body.status || "draft",
    })
    .returning();

  return NextResponse.json({ template: row }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const db = getDb();

  const [row] = await db
    .update(newsletterTemplates)
    .set({
      title: body.title,
      subject: body.subject,
      parshaName: body.parshaName,
      shabbatDate: body.shabbatDate,
      hebrewDate: body.hebrewDate,
      candleLighting: body.candleLighting,
      bodyHtml: body.bodyHtml,
      status: body.status,
      updatedAt: new Date(),
    })
    .where(eq(newsletterTemplates.id, body.id))
    .returning();

  return NextResponse.json({ template: row });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  const db = getDb();

  await db.delete(newsletterTemplates).where(eq(newsletterTemplates.id, id));

  return NextResponse.json({ deleted: true });
}
