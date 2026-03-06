import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  contactMethods,
  families,
  familyMembers,
  paymentCampaigns,
  paymentsLedger,
  people,
  taxDocuments,
  users,
} from "@/db/schema";
import {
  deriveTaxTreatment,
} from "@/lib/payments/shared";
import { ensurePersonByEmail } from "@/lib/people/service";
import { normalizeUserEmail } from "@/lib/users/validation";

export {
  buildDonationThankYouMessage,
  DESIGNATION_OPTIONS,
  PAYMENT_KIND_OPTIONS,
  PAYMENT_SOURCE_OPTIONS,
} from "@/lib/payments/shared";

type PaymentSource =
  | "stripe"
  | "paypal"
  | "zelle"
  | "flipcause"
  | "network_for_good"
  | "chesed"
  | "manual"
  | "other";

type PaymentKind = "donation" | "membership_dues" | "campaign_donation" | "event" | "goods_services" | "other";
type PaymentClassificationStatus = "unreconciled" | "auto_matched" | "manually_matched";
type TaxDeductibility = "deductible" | "partially_deductible" | "non_deductible";

function organizationLegalName() {
  return process.env.ORG_LEGAL_NAME?.trim() || "Mekor Habracha";
}

function organizationEin() {
  return process.env.ORG_EIN?.trim() || "EIN pending";
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function clean(value: string | null | undefined) {
  return (value ?? "").trim();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function makeGuestEmail(input: { displayName: string; phone?: string }) {
  const base = slugify(input.displayName) || normalizePhone(input.phone ?? "") || "guest";
  return `${base}-${Date.now().toString(36)}@guest.local`;
}

function receiptNumberForPayment(paymentId: number, paidAt: Date) {
  return `MH-${paidAt.getUTCFullYear()}-${String(paymentId).padStart(6, "0")}`;
}

function documentNumber(prefix: "R" | "Y", subjectId: number, taxYear: number) {
  return `MH-${prefix}-${taxYear}-${String(subjectId).padStart(6, "0")}`;
}

function receiptGoodsServicesStatement(input: { goodsServicesValueCents: number; deductibleAmountCents: number }) {
  if (input.goodsServicesValueCents < 1) {
    return "No goods or services were provided in exchange for this contribution.";
  }
  if (input.deductibleAmountCents < 1) {
    return "Goods or services were provided in exchange for this payment, so no portion is tax deductible.";
  }
  return `Goods or services valued at $${(input.goodsServicesValueCents / 100).toFixed(2)} were provided in exchange for this payment. Only the deductible portion may be claimed for tax purposes.`;
}

async function findMatchingPerson(input: { email?: string; phone?: string }) {
  const email = normalizeUserEmail(clean(input.email));
  const phone = normalizePhone(clean(input.phone));
  const db = getDb();

  if (email) {
    const [direct] = await db
      .select({
        id: people.id,
        userId: people.userId,
        displayName: people.displayName,
        status: people.status,
      })
      .from(people)
      .where(eq(people.email, email))
      .limit(1);
    if (direct) {
      return direct;
    }
  }

  const contactMatches =
    email || phone
      ? await db
          .select({
            id: people.id,
            userId: people.userId,
            displayName: people.displayName,
            status: people.status,
          })
          .from(contactMethods)
          .innerJoin(people, eq(people.id, contactMethods.personId))
          .where(
            or(
              email ? and(eq(contactMethods.type, "email"), eq(contactMethods.value, email)) : undefined,
              phone ? and(eq(contactMethods.type, "phone"), eq(contactMethods.value, phone)) : undefined,
            ),
          )
          .orderBy(
            sql`case when ${people.status} in ('member', 'admin', 'super_admin') then 0 when ${people.status} = 'guest' then 1 else 2 end`,
            asc(people.id),
          )
          .limit(1)
      : [];

  return contactMatches[0] ?? null;
}

async function upsertSecondaryContactMethods(input: { personId: number; email?: string; phone?: string }) {
  const db = getDb();
  const email = normalizeUserEmail(clean(input.email));
  const phone = normalizePhone(clean(input.phone));
  const now = new Date();

  if (email) {
    await db
      .insert(contactMethods)
      .values({
        personId: input.personId,
        type: "email",
        value: email,
        isPrimary: false,
        verifiedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [contactMethods.personId, contactMethods.type, contactMethods.value],
        set: {
          updatedAt: now,
        },
      });
  }

  if (phone) {
    await db
      .insert(contactMethods)
      .values({
        personId: input.personId,
        type: "phone",
        value: phone,
        isPrimary: false,
        verifiedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [contactMethods.personId, contactMethods.type, contactMethods.value],
        set: {
          updatedAt: now,
        },
      });
  }
}

async function getActiveFamilyForUser(userId: number) {
  const [family] = await getDb()
    .select({
      familyId: families.id,
    })
    .from(familyMembers)
    .innerJoin(families, eq(families.id, familyMembers.familyId))
    .where(and(eq(familyMembers.userId, userId), eq(familyMembers.membershipStatus, "active"), eq(families.status, "active")))
    .limit(1);

  return family?.familyId ?? null;
}

async function ensurePaymentPerson(input: {
  displayName: string;
  email?: string;
  phone?: string;
  status: "guest" | "member";
}) {
  const displayName = clean(input.displayName) || clean(input.email) || clean(input.phone) || "Guest donor";
  const email = normalizeUserEmail(clean(input.email)) || makeGuestEmail({ displayName, phone: input.phone });
  const person = await ensurePersonByEmail({
    email,
    status: input.status,
    displayName,
    source: "payment_reconciliation",
  });
  await upsertSecondaryContactMethods({
    personId: person.personId,
    email: input.email,
    phone: input.phone,
  });
  return person.personId;
}

export async function createPaymentCampaign(input: {
  createdByUserId: number;
  title: string;
  description?: string;
  designationLabel?: string;
  targetAmountCents?: number | null;
  suggestedAmountCents?: number | null;
  status?: "draft" | "active" | "closed" | "archived";
}) {
  const baseSlug = slugify(input.title) || `campaign-${Date.now().toString(36)}`;
  const slug = `${baseSlug}-${Date.now().toString(36).slice(-5)}`;
  const now = new Date();
  const [created] = await getDb()
    .insert(paymentCampaigns)
    .values({
      createdByUserId: input.createdByUserId,
      title: clean(input.title),
      slug,
      description: clean(input.description),
      designationLabel: clean(input.designationLabel) || clean(input.title),
      targetAmountCents: input.targetAmountCents ?? null,
      suggestedAmountCents: input.suggestedAmountCents ?? null,
      status: input.status ?? "draft",
      shareablePath: `/campaigns/${slug}`,
      launchedAt: input.status === "active" ? now : null,
      closedAt: input.status === "closed" ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function listPaymentCampaigns() {
  return getDb().select().from(paymentCampaigns).orderBy(desc(paymentCampaigns.updatedAt), desc(paymentCampaigns.id));
}

export async function updatePaymentCampaign(input: {
  id: number;
  title: string;
  description?: string;
  designationLabel?: string;
  targetAmountCents?: number | null;
  suggestedAmountCents?: number | null;
  status: "draft" | "active" | "closed" | "archived";
}) {
  const now = new Date();
  const [updated] = await getDb()
    .update(paymentCampaigns)
    .set({
      title: clean(input.title),
      description: clean(input.description),
      designationLabel: clean(input.designationLabel) || clean(input.title),
      targetAmountCents: input.targetAmountCents ?? null,
      suggestedAmountCents: input.suggestedAmountCents ?? null,
      status: input.status,
      launchedAt: input.status === "active" ? now : null,
      closedAt: input.status === "closed" ? now : null,
      updatedAt: now,
    })
    .where(eq(paymentCampaigns.id, input.id))
    .returning();
  return updated;
}

function buildReceiptPayload(input: {
  paymentId: number;
  donorName: string;
  amountCents: number;
  deductibleAmountCents: number;
  paidAt: Date;
  designation: string;
  goodsServicesValueCents: number;
  receiptNumber: string;
}) {
  return {
    receiptNumber: input.receiptNumber,
    donorName: input.donorName,
    donationAmountCents: input.amountCents,
    deductibleAmountCents: input.deductibleAmountCents,
    donationDate: input.paidAt.toISOString(),
    designation: input.designation,
    organizationLegalName: organizationLegalName(),
    organizationEin: organizationEin(),
    taxDeductibilityStatement:
      input.deductibleAmountCents > 0
        ? "Please retain this receipt for your tax records. The deductible portion is listed below."
        : "This payment does not include a deductible charitable contribution.",
    goodsServicesStatement: receiptGoodsServicesStatement({
      goodsServicesValueCents: input.goodsServicesValueCents,
      deductibleAmountCents: input.deductibleAmountCents,
    }),
  };
}

export async function ensureTaxReceiptForPayment(paymentId: number) {
  const db = getDb();
  const [payment] = await db
    .select({
      id: paymentsLedger.id,
      personId: paymentsLedger.personId,
      paidAt: paymentsLedger.paidAt,
      amountCents: paymentsLedger.amountCents,
      deductibleAmountCents: paymentsLedger.deductibleAmountCents,
      goodsServicesValueCents: paymentsLedger.goodsServicesValueCents,
      designation: paymentsLedger.designation,
      receiptNumber: paymentsLedger.receiptNumber,
      payerDisplayName: paymentsLedger.payerDisplayName,
    })
    .from(paymentsLedger)
    .where(eq(paymentsLedger.id, paymentId))
    .limit(1);

  if (!payment || !payment.personId || payment.deductibleAmountCents < 1) {
    return null;
  }

  const [existing] = await db
    .select({ id: taxDocuments.id })
    .from(taxDocuments)
    .where(and(eq(taxDocuments.paymentId, payment.id), eq(taxDocuments.documentType, "receipt")))
    .limit(1);
  if (existing) {
    return existing;
  }

  const receiptNumber = clean(payment.receiptNumber) || receiptNumberForPayment(payment.id, payment.paidAt);
  await db
    .update(paymentsLedger)
    .set({
      receiptNumber,
      receiptGeneratedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(paymentsLedger.id, payment.id));

  const payload = buildReceiptPayload({
    paymentId: payment.id,
    donorName: clean(payment.payerDisplayName) || "Donor",
    amountCents: payment.amountCents,
    deductibleAmountCents: payment.deductibleAmountCents,
    paidAt: payment.paidAt,
    designation: payment.designation,
    goodsServicesValueCents: payment.goodsServicesValueCents,
    receiptNumber,
  });

  const [created] = await db
    .insert(taxDocuments)
    .values({
      personId: payment.personId,
      familyId: null,
      paymentId: payment.id,
      documentType: "receipt",
      taxYear: payment.paidAt.getUTCFullYear(),
      title: `Donation receipt ${receiptNumber}`,
      documentNumber: receiptNumber,
      fileUrl: "",
      payloadJson: payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

export async function recordPayment(input: {
  source: PaymentSource;
  sourceLabel?: string;
  externalPaymentId?: string;
  externalReference?: string;
  status?: "pending" | "succeeded" | "failed" | "refunded";
  kind: PaymentKind;
  amountCents: number;
  currency?: string;
  designation?: string;
  payerDisplayName: string;
  payerEmail?: string;
  payerPhone?: string;
  paidAt: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
  personId?: number | null;
  userId?: number | null;
  familyId?: number | null;
  goodsServicesValueCents?: number;
  taxDeductibility?: TaxDeductibility | null;
  classificationStatus?: PaymentClassificationStatus;
  campaignId?: number | null;
  membershipApplicationId?: number | null;
  duesInvoiceId?: number | null;
  eventRegistrationId?: number | null;
  createGuestIfMissing?: boolean;
}) {
  const db = getDb();
  const email = normalizeUserEmail(clean(input.payerEmail));
  const phone = normalizePhone(clean(input.payerPhone));
  const tax = deriveTaxTreatment({
    kind: input.kind,
    designation: clean(input.designation) || "General donation",
    amountCents: input.amountCents,
    goodsServicesValueCents: input.goodsServicesValueCents,
    explicitTaxDeductibility: input.taxDeductibility ?? null,
  });

  let personId = input.personId ?? null;
  let userId = input.userId ?? null;
  let familyId = input.familyId ?? null;
  let classificationStatus = input.classificationStatus ?? ("unreconciled" as PaymentClassificationStatus);

  if (personId && !input.classificationStatus) {
    classificationStatus = "manually_matched";
  }

  if (!personId) {
    const match = await findMatchingPerson({ email, phone });
    if (match) {
      personId = match.id;
      userId = match.userId ?? null;
      classificationStatus = "auto_matched";
    }
  }

  if (!personId && input.createGuestIfMissing) {
    personId = await ensurePaymentPerson({
      displayName: input.payerDisplayName,
      email,
      phone,
      status: "guest",
    });
    classificationStatus = "manually_matched";
  }

  if (personId && !userId) {
    const [person] = await db
      .select({
        userId: people.userId,
      })
      .from(people)
      .where(eq(people.id, personId))
      .limit(1);
    userId = person?.userId ?? null;
  }

  if (!familyId && userId) {
    familyId = await getActiveFamilyForUser(userId);
  }

  const [created] = await db
    .insert(paymentsLedger)
    .values({
      personId,
      userId,
      familyId,
      duesInvoiceId: input.duesInvoiceId ?? null,
      membershipApplicationId: input.membershipApplicationId ?? null,
      eventRegistrationId: input.eventRegistrationId ?? null,
      campaignId: input.campaignId ?? null,
      source: input.source,
      sourceLabel: clean(input.sourceLabel),
      externalPaymentId: clean(input.externalPaymentId),
      externalReference: clean(input.externalReference),
      status: input.status ?? "succeeded",
      kind: input.kind,
      classificationStatus,
      taxDeductibility: tax.taxDeductibility,
      amountCents: input.amountCents,
      deductibleAmountCents: tax.deductibleAmountCents,
      goodsServicesValueCents: tax.goodsServicesValueCents,
      currency: clean(input.currency) || "usd",
      designation: clean(input.designation) || "General donation",
      payerDisplayName: clean(input.payerDisplayName),
      payerEmail: email,
      payerPhone: phone,
      notes: clean(input.notes),
      metadataJson: input.metadata ?? {},
      paidAt: input.paidAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (personId && (email || phone)) {
    await upsertSecondaryContactMethods({
      personId,
      email,
      phone,
    });
  }

  if (created.status === "succeeded") {
    await ensureTaxReceiptForPayment(created.id);
  }

  return created;
}

export async function reassignPayment(input: {
  paymentId: number;
  personId?: number | null;
  createPersonStatus?: "guest" | "member";
  displayName?: string;
}) {
  const db = getDb();
  const [payment] = await db
    .select({
      id: paymentsLedger.id,
      payerDisplayName: paymentsLedger.payerDisplayName,
      payerEmail: paymentsLedger.payerEmail,
      payerPhone: paymentsLedger.payerPhone,
    })
    .from(paymentsLedger)
    .where(eq(paymentsLedger.id, input.paymentId))
    .limit(1);

  if (!payment) {
    throw new Error("Payment not found");
  }

  let personId = input.personId ?? null;
  if (!personId && input.createPersonStatus) {
    personId = await ensurePaymentPerson({
      displayName: clean(input.displayName) || payment.payerDisplayName,
      email: payment.payerEmail,
      phone: payment.payerPhone,
      status: input.createPersonStatus,
    });
  }
  if (!personId) {
    throw new Error("Person is required");
  }

  const [person] = await db
    .select({
      userId: people.userId,
    })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);

  const familyId = person?.userId ? await getActiveFamilyForUser(person.userId) : null;

  const [updated] = await db
    .update(paymentsLedger)
    .set({
      personId,
      userId: person?.userId ?? null,
      familyId,
      classificationStatus: "manually_matched",
      updatedAt: new Date(),
    })
    .where(eq(paymentsLedger.id, input.paymentId))
    .returning();

  await upsertSecondaryContactMethods({
    personId,
    email: payment.payerEmail,
    phone: payment.payerPhone,
  });

  if (updated.status === "succeeded") {
    await ensureTaxReceiptForPayment(updated.id);
  }

  return updated;
}

export async function listPayments(input?: {
  q?: string;
  classificationStatus?: PaymentClassificationStatus | "";
  personId?: number;
  familyId?: number;
  userId?: number;
  taxYear?: number;
}) {
  const q = clean(input?.q);
  const yearStart = input?.taxYear ? new Date(Date.UTC(input.taxYear, 0, 1)) : null;
  const yearEnd = input?.taxYear ? new Date(Date.UTC(input.taxYear, 11, 31, 23, 59, 59, 999)) : null;

  return getDb()
    .select({
      id: paymentsLedger.id,
      personId: paymentsLedger.personId,
      userId: paymentsLedger.userId,
      familyId: paymentsLedger.familyId,
      campaignId: paymentsLedger.campaignId,
      source: paymentsLedger.source,
      status: paymentsLedger.status,
      kind: paymentsLedger.kind,
      classificationStatus: paymentsLedger.classificationStatus,
      taxDeductibility: paymentsLedger.taxDeductibility,
      amountCents: paymentsLedger.amountCents,
      deductibleAmountCents: paymentsLedger.deductibleAmountCents,
      goodsServicesValueCents: paymentsLedger.goodsServicesValueCents,
      currency: paymentsLedger.currency,
      designation: paymentsLedger.designation,
      payerDisplayName: paymentsLedger.payerDisplayName,
      payerEmail: paymentsLedger.payerEmail,
      payerPhone: paymentsLedger.payerPhone,
      paidAt: paymentsLedger.paidAt,
      receiptNumber: paymentsLedger.receiptNumber,
      personDisplayName: people.displayName,
      personStatus: people.status,
      userDisplayName: users.displayName,
      campaignTitle: paymentCampaigns.title,
    })
    .from(paymentsLedger)
    .leftJoin(people, eq(people.id, paymentsLedger.personId))
    .leftJoin(users, eq(users.id, paymentsLedger.userId))
    .leftJoin(paymentCampaigns, eq(paymentCampaigns.id, paymentsLedger.campaignId))
    .where(
      and(
        input?.classificationStatus ? eq(paymentsLedger.classificationStatus, input.classificationStatus) : undefined,
        input?.personId ? eq(paymentsLedger.personId, input.personId) : undefined,
        input?.familyId ? eq(paymentsLedger.familyId, input.familyId) : undefined,
        input?.userId ? eq(paymentsLedger.userId, input.userId) : undefined,
        yearStart ? gte(paymentsLedger.paidAt, yearStart) : undefined,
        yearEnd ? lte(paymentsLedger.paidAt, yearEnd) : undefined,
        q
          ? or(
              ilike(paymentsLedger.payerDisplayName, `%${q}%`),
              ilike(paymentsLedger.payerEmail, `%${q}%`),
              ilike(paymentsLedger.designation, `%${q}%`),
              ilike(people.displayName, `%${q}%`),
              ilike(paymentCampaigns.title, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(paymentsLedger.paidAt), desc(paymentsLedger.id));
}

export async function getPaymentSummaryForTaxYear(input: { personId: number; taxYear: number }) {
  const yearStart = new Date(Date.UTC(input.taxYear, 0, 1));
  const yearEnd = new Date(Date.UTC(input.taxYear, 11, 31, 23, 59, 59, 999));
  const rows = await getDb()
    .select({
      id: paymentsLedger.id,
      amountCents: paymentsLedger.amountCents,
      deductibleAmountCents: paymentsLedger.deductibleAmountCents,
      taxDeductibility: paymentsLedger.taxDeductibility,
      designation: paymentsLedger.designation,
      paidAt: paymentsLedger.paidAt,
    })
    .from(paymentsLedger)
    .where(
      and(
        eq(paymentsLedger.personId, input.personId),
        eq(paymentsLedger.status, "succeeded"),
        gte(paymentsLedger.paidAt, yearStart),
        lte(paymentsLedger.paidAt, yearEnd),
        inArray(paymentsLedger.taxDeductibility, ["deductible", "partially_deductible"]),
      ),
    )
    .orderBy(asc(paymentsLedger.paidAt), asc(paymentsLedger.id));

  return {
    payments: rows,
    totalAmountCents: rows.reduce((sum, row) => sum + row.amountCents, 0),
    totalDeductibleAmountCents: rows.reduce((sum, row) => sum + row.deductibleAmountCents, 0),
  };
}

export async function ensureYearEndLetter(input: { personId: number; taxYear: number }) {
  const db = getDb();
  const [person] = await db
    .select({
      id: people.id,
      displayName: people.displayName,
      email: people.email,
      userId: people.userId,
    })
    .from(people)
    .where(eq(people.id, input.personId))
    .limit(1);

  if (!person) {
    throw new Error("Person not found");
  }

  const summary = await getPaymentSummaryForTaxYear(input);
  const [existing] = await db
    .select({ id: taxDocuments.id })
    .from(taxDocuments)
    .where(
      and(
        eq(taxDocuments.personId, input.personId),
        eq(taxDocuments.documentType, "year_end_letter"),
        eq(taxDocuments.taxYear, input.taxYear),
      ),
    )
    .limit(1);
  if (existing) {
    return existing;
  }

  const payload = {
    donorName: person.displayName,
    donorEmail: person.email,
    taxYear: input.taxYear,
    organizationLegalName: organizationLegalName(),
    organizationEin: organizationEin(),
    totalDeductibleAmountCents: summary.totalDeductibleAmountCents,
    payments: summary.payments.map((payment) => ({
      paidAt: payment.paidAt.toISOString(),
      designation: payment.designation,
      deductibleAmountCents: payment.deductibleAmountCents,
    })),
    summaryLanguage:
      "This letter summarizes charitable contributions that qualify for tax reporting. Payments tied to goods or services are excluded.",
  };

  const [created] = await db
    .insert(taxDocuments)
    .values({
      personId: input.personId,
      familyId: person.userId ? await getActiveFamilyForUser(person.userId) : null,
      paymentId: null,
      documentType: "year_end_letter",
      taxYear: input.taxYear,
      title: `${input.taxYear} annual donation summary`,
      documentNumber: documentNumber("Y", input.personId, input.taxYear),
      fileUrl: "",
      payloadJson: payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}
