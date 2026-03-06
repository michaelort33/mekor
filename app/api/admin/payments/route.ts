import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { listPayments, reassignPayment, recordPayment } from "@/lib/payments/service";

const createPaymentSchema = z.object({
  source: z.enum(["stripe", "paypal", "zelle", "flipcause", "network_for_good", "chesed", "manual", "other"]),
  sourceLabel: z.string().trim().max(120).default(""),
  externalPaymentId: z.string().trim().max(255).default(""),
  externalReference: z.string().trim().max(255).default(""),
  status: z.enum(["pending", "succeeded", "failed", "refunded"]).default("succeeded"),
  kind: z.enum(["donation", "membership_dues", "campaign_donation", "event", "goods_services", "other"]),
  amountCents: z.number().int().min(1),
  currency: z.string().trim().min(3).max(3).default("usd"),
  designation: z.string().trim().max(180).default("General donation"),
  payerDisplayName: z.string().trim().min(1).max(180),
  payerEmail: z.string().trim().max(255).default(""),
  payerPhone: z.string().trim().max(60).default(""),
  paidAt: z.string().datetime(),
  notes: z.string().trim().max(4000).default(""),
  goodsServicesValueCents: z.number().int().min(0).default(0),
  campaignId: z.number().int().min(1).nullable().default(null),
  personId: z.number().int().min(1).nullable().default(null),
  createGuestIfMissing: z.boolean().default(false),
});

const updatePaymentSchema = z.object({
  paymentId: z.number().int().min(1),
  personId: z.number().int().min(1).nullable().optional(),
  createPersonStatus: z.enum(["guest", "member"]).optional(),
  displayName: z.string().trim().max(180).default(""),
});

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const classificationStatus = searchParams.get("classificationStatus")?.trim() as "" | "unreconciled" | "auto_matched" | "manually_matched";
  const taxYearParam = searchParams.get("taxYear")?.trim() ?? "";
  const taxYear = taxYearParam ? Number(taxYearParam) : undefined;

  const payments = await listPayments({
    q,
    classificationStatus,
    taxYear: Number.isInteger(taxYear) ? taxYear : undefined,
  });

  const totalAmountCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const unreconciledCount = payments.filter((payment) => payment.classificationStatus === "unreconciled").length;
  const deductibleAmountCents = payments.reduce((sum, payment) => sum + payment.deductibleAmountCents, 0);

  return NextResponse.json({
    payments,
    stats: {
      totalCount: payments.length,
      unreconciledCount,
      totalAmountCents,
      deductibleAmountCents,
    },
  });
}

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const parsed = createPaymentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const payment = await recordPayment({
    ...parsed.data,
    paidAt: new Date(parsed.data.paidAt),
  });

  await writeAdminAuditLog({
    actorUserId: adminResult.actor.id,
    action: "payment.recorded",
    targetType: "payment",
    targetId: String(payment.id),
    payload: {
      source: payment.source,
      kind: payment.kind,
      amountCents: payment.amountCents,
      classificationStatus: payment.classificationStatus,
    },
  });

  return NextResponse.json({ payment }, { status: 201 });
}

export async function PUT(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const parsed = updatePaymentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const payment = await reassignPayment(parsed.data);

  await writeAdminAuditLog({
    actorUserId: adminResult.actor.id,
    action: "payment.reassigned",
    targetType: "payment",
    targetId: String(payment.id),
    payload: {
      personId: payment.personId,
      classificationStatus: payment.classificationStatus,
    },
  });

  return NextResponse.json({ payment });
}
