import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { familyMembers } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { renderPaymentHistoryPdf } from "@/lib/payments/documents";
import { listPayments } from "@/lib/payments/service";

export const runtime = "nodejs";

function toCsv(rows: Awaited<ReturnType<typeof listPayments>>) {
  const header = [
    "date",
    "source",
    "kind",
    "designation",
    "amount_cents",
    "deductible_amount_cents",
    "currency",
    "classification_status",
  ];
  const body = rows.map((row) =>
    [
      row.paidAt.toISOString(),
      row.source,
      row.kind,
      row.designation,
      String(row.amountCents),
      String(row.deductibleAmountCents),
      row.currency,
      row.classificationStatus,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format")?.trim() === "pdf" ? "pdf" : "csv";
  const scope = searchParams.get("scope")?.trim() === "family" ? "family" : "personal";

  const [familyAdminMembership] =
    scope === "family"
      ? await getDb()
          .select({ familyId: familyMembers.familyId })
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.userId, session.userId),
              eq(familyMembers.membershipStatus, "active"),
              eq(familyMembers.roleInFamily, "primary_adult"),
            ),
          )
          .limit(1)
      : [];

  const rows =
    scope === "family" && familyAdminMembership
      ? await listPayments({ familyId: familyAdminMembership.familyId })
      : await listPayments({ userId: session.userId });

  if (format === "csv") {
    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${scope}-payments.csv"`,
      },
    });
  }

  const buffer = await renderPaymentHistoryPdf({
    title: scope === "family" ? "Household payment history" : "Personal payment history",
    subtitle: `Generated for user ${session.userId}`,
    rows,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${scope}-payments.pdf"`,
    },
  });
}
