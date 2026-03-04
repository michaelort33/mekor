import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { requireAdminActor } from "@/lib/admin/actor";

async function requireAdmin() {
  const result = await requireAdminActor();
  if ("error" in result) return result.error;
  return null;
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");
  const db = getDb();

  if (idParam) {
    const id = Number(idParam);
    const [row] = await db
      .select()
      .from(newsletterTemplates)
      .where(eq(newsletterTemplates.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template: row });
  }

  const rows = await db
    .select()
    .from(newsletterTemplates)
    .orderBy(desc(newsletterTemplates.updatedAt));

  return NextResponse.json({ templates: rows });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  const db = getDb();

  await db.delete(newsletterTemplates).where(eq(newsletterTemplates.id, id));

  return NextResponse.json({ deleted: true });
}
