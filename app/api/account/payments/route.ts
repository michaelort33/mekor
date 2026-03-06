import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { familyMembers, people } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { getPaymentSummaryForTaxYear, listPayments } from "@/lib/payments/service";

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taxYearParam = searchParams.get("taxYear")?.trim() ?? "";
  const taxYear = taxYearParam ? Number(taxYearParam) : new Date().getUTCFullYear();

  const db = getDb();
  const [person] = await db
    .select({
      id: people.id,
      displayName: people.displayName,
    })
    .from(people)
    .where(eq(people.userId, session.userId))
    .limit(1);

  const [familyAdminMembership] = await db
    .select({
      familyId: familyMembers.familyId,
    })
    .from(familyMembers)
    .where(and(eq(familyMembers.userId, session.userId), eq(familyMembers.membershipStatus, "active"), eq(familyMembers.roleInFamily, "primary_adult")))
    .limit(1);

  const personalPayments = await listPayments({ userId: session.userId });
  const familyPayments = familyAdminMembership ? await listPayments({ familyId: familyAdminMembership.familyId }) : [];
  const taxSummary = person ? await getPaymentSummaryForTaxYear({ personId: person.id, taxYear }) : null;

  const availableYears = Array.from(
    new Set(
      personalPayments
        .map((payment) => payment.paidAt.getUTCFullYear())
        .sort((a, b) => b - a),
    ),
  );

  return NextResponse.json({
    actor: {
      userId: session.userId,
      personId: person?.id ?? null,
      displayName: person?.displayName ?? `User ${session.userId}`,
    },
    familyAdmin: Boolean(familyAdminMembership),
    selectedTaxYear: taxYear,
    availableYears,
    personalPayments,
    familyPayments,
    taxSummary,
  });
}
