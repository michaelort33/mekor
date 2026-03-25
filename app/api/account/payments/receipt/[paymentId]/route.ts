import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireApprovedMemberAccountAccess } from "@/lib/auth/account-access";
import { getDb } from "@/db/client";
import { familyMembers, paymentsLedger, taxDocuments } from "@/db/schema";
import { renderTaxReceiptPdf } from "@/lib/payments/documents";
import { ensureTaxReceiptForPayment } from "@/lib/payments/service";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ paymentId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const access = await requireApprovedMemberAccountAccess();
  if ("error" in access) {
    return access.error;
  }

  const { paymentId } = await params;
  const id = Number(paymentId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  const [familyAdminMembership] = await getDb()
    .select({ familyId: familyMembers.familyId })
    .from(familyMembers)
    .where(
      and(
        eq(familyMembers.userId, access.session.userId),
        eq(familyMembers.membershipStatus, "active"),
        eq(familyMembers.roleInFamily, "primary_adult"),
      ),
    )
    .limit(1);

  const [payment] = await getDb()
    .select({
      id: paymentsLedger.id,
    })
    .from(paymentsLedger)
    .where(
      and(
        eq(paymentsLedger.id, id),
        or(
          eq(paymentsLedger.userId, access.session.userId),
          familyAdminMembership ? eq(paymentsLedger.familyId, familyAdminMembership.familyId) : undefined,
        ),
      ),
    )
    .limit(1);
  if (!payment) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  await ensureTaxReceiptForPayment(id);
  const [document] = await getDb()
    .select({
      payloadJson: taxDocuments.payloadJson,
    })
    .from(taxDocuments)
    .where(and(eq(taxDocuments.paymentId, id), eq(taxDocuments.documentType, "receipt")))
    .limit(1);

  if (!document) {
    return NextResponse.json({ error: "Receipt not available for this payment" }, { status: 404 });
  }

  const buffer = await renderTaxReceiptPdf(document.payloadJson as never);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${id}.pdf"`,
    },
  });
}
