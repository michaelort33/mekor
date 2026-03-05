import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";

async function requireAdmin() {
  const result = await requireAdminActor();
  if ("error" in result) return result;
  return result;
}

export async function GET(request: Request) {
  const adminResult = await requireAdmin();
  if ("error" in adminResult) return adminResult.error;

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
  const adminResult = await requireAdmin();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

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

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "newsletter.template.created",
    targetType: "newsletter_template",
    targetId: String(row.id),
    payload: {
      title: row.title,
      subject: row.subject,
      status: row.status,
    },
  });

  return NextResponse.json({ template: row }, { status: 201 });
}

export async function PUT(request: Request) {
  const adminResult = await requireAdmin();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

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

  if (row) {
    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "newsletter.template.updated",
      targetType: "newsletter_template",
      targetId: String(row.id),
      payload: {
        title: row.title,
        subject: row.subject,
        status: row.status,
      },
    });
  }

  return NextResponse.json({ template: row });
}

export async function DELETE(request: Request) {
  const adminResult = await requireAdmin();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  const db = getDb();

  const [existing] = await db
    .select({
      id: newsletterTemplates.id,
      title: newsletterTemplates.title,
      subject: newsletterTemplates.subject,
    })
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, id))
    .limit(1);

  await db.delete(newsletterTemplates).where(eq(newsletterTemplates.id, id));

  if (existing) {
    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "newsletter.template.deleted",
      targetType: "newsletter_template",
      targetId: String(existing.id),
      payload: {
        title: existing.title,
        subject: existing.subject,
      },
    });
  }

  return NextResponse.json({ deleted: true });
}
