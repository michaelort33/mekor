import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireApprovedMemberAccountAccess } from "@/lib/auth/account-access";
import { getDb } from "@/db/client";
import { people, taxDocuments } from "@/db/schema";
import { renderYearEndLetterPdf } from "@/lib/payments/documents";
import { ensureYearEndLetter } from "@/lib/payments/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireApprovedMemberAccountAccess();
  if ("error" in access) {
    return access.error;
  }

  const { searchParams } = new URL(request.url);
  const taxYear = Number(searchParams.get("taxYear") ?? new Date().getUTCFullYear());
  if (!Number.isInteger(taxYear) || taxYear < 2000 || taxYear > 2100) {
    return NextResponse.json({ error: "Invalid tax year" }, { status: 400 });
  }

  const [person] = await getDb()
    .select({
      id: people.id,
      displayName: people.displayName,
    })
    .from(people)
    .where(eq(people.userId, access.session.userId))
    .limit(1);
  if (!person) {
    return NextResponse.json({ error: "No linked CRM person found" }, { status: 404 });
  }

  await ensureYearEndLetter({ personId: person.id, taxYear });

  const [document] = await getDb()
    .select({
      payloadJson: taxDocuments.payloadJson,
    })
    .from(taxDocuments)
    .where(
      and(
        eq(taxDocuments.personId, person.id),
        eq(taxDocuments.documentType, "year_end_letter"),
        eq(taxDocuments.taxYear, taxYear),
      ),
    )
    .limit(1);

  if (!document) {
    return NextResponse.json({ error: "Letter unavailable" }, { status: 404 });
  }

  const payload = document.payloadJson as {
    donorName: string;
    taxYear: number;
    organizationLegalName: string;
    organizationEin: string;
    totalDeductibleAmountCents: number;
    payments: Array<{ paidAt: string; designation: string; deductibleAmountCents: number }>;
  };

  const buffer = await renderYearEndLetterPdf(payload);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="year-end-letter-${taxYear}.pdf"`,
    },
  });
}
