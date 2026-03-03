import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { duesInvoices, householdMembers, households, membershipTerms } from "@/db/schema";
import { householdCsvRowSchema } from "@/lib/member-ops/contracts";

type ImportError = {
  rowNumber: number;
  reason: string;
};

type ImportWarning = {
  rowNumber: number;
  reason: string;
};

const HEADER = [
  "householdName",
  "billingEmail",
  "billingPhone",
  "memberFirstName",
  "memberLastName",
  "memberDisplayName",
  "memberEmail",
  "memberPhone",
  "relationship",
  "isPrimary",
  "cycleLabel",
  "cycleStartIso",
  "cycleEndIso",
  "renewalStatus",
  "openingBalanceCents",
] as const;

export function householdImportTemplateCsv() {
  return [
    HEADER.join(","),
    [
      "Levi Household",
      "levi@example.com",
      "215-555-1212",
      "Ari",
      "Levi",
      "Ari Levi",
      "ari@example.com",
      "215-555-0001",
      "self",
      "true",
      "2025-2026",
      "2025-09-01T00:00:00.000Z",
      "2026-08-31T23:59:59.000Z",
      "invited",
      "200000",
    ].join(","),
  ].join("\n");
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headerCells = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = parseCsvLine(lines[lineIndex]);
    const row: Record<string, string> = {};
    for (let index = 0; index < headerCells.length; index += 1) {
      row[headerCells[index] ?? `col_${index}`] = values[index] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

function toBoolean(value: string) {
  return /^(true|1|yes|y)$/i.test(value.trim());
}

function toInt(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function importHouseholdsFromCsv(csv: string) {
  const db = getDb();
  const rows = parseCsv(csv);

  let createdHouseholds = 0;
  let updatedHouseholds = 0;
  let createdMembers = 0;
  let updatedMembers = 0;
  let createdTerms = 0;
  let createdOpeningInvoices = 0;
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = rows[index];

    const parsed = householdCsvRowSchema.safeParse({
      householdName: row.householdName,
      billingEmail: row.billingEmail,
      billingPhone: row.billingPhone,
      memberFirstName: row.memberFirstName,
      memberLastName: row.memberLastName,
      memberDisplayName: row.memberDisplayName,
      memberEmail: row.memberEmail || undefined,
      memberPhone: row.memberPhone,
      relationship: row.relationship,
      isPrimary: toBoolean(row.isPrimary),
      cycleLabel: row.cycleLabel,
      cycleStartIso: row.cycleStartIso,
      cycleEndIso: row.cycleEndIso,
      renewalStatus: row.renewalStatus,
      openingBalanceCents: toInt(row.openingBalanceCents),
    });

    if (!parsed.success) {
      errors.push({ rowNumber, reason: parsed.error.issues.map((issue) => issue.message).join("; ") });
      continue;
    }

    const data = parsed.data;

    const [existingHousehold] = await db
      .select({ id: households.id })
      .from(households)
      .where(and(eq(households.name, data.householdName), eq(households.billingEmail, data.billingEmail)))
      .limit(1);

    let householdId = 0;
    if (existingHousehold) {
      householdId = existingHousehold.id;
      await db
        .update(households)
        .set({
          billingPhone: data.billingPhone,
          updatedAt: new Date(),
        })
        .where(eq(households.id, existingHousehold.id));
      updatedHouseholds += 1;
    } else {
      const [createdHousehold] = await db
        .insert(households)
        .values({
          name: data.householdName,
          billingEmail: data.billingEmail,
          billingPhone: data.billingPhone,
        })
        .returning({ id: households.id });

      if (!createdHousehold) {
        errors.push({ rowNumber, reason: "Failed to create household" });
        continue;
      }

      householdId = createdHousehold.id;
      createdHouseholds += 1;
    }

    const [existingMember] = await db
      .select({ id: householdMembers.id })
      .from(householdMembers)
      .where(
        data.memberEmail
          ? eq(householdMembers.email, data.memberEmail)
          : and(eq(householdMembers.householdId, householdId), eq(householdMembers.displayName, data.memberDisplayName)),
      )
      .limit(1);

    let memberId = 0;
    if (existingMember) {
      memberId = existingMember.id;
      await db
        .update(householdMembers)
        .set({
          householdId,
          firstName: data.memberFirstName,
          lastName: data.memberLastName,
          displayName: data.memberDisplayName,
          email: data.memberEmail ?? null,
          phone: data.memberPhone,
          relationship: data.relationship,
          isPrimary: data.isPrimary,
          updatedAt: new Date(),
        })
        .where(eq(householdMembers.id, existingMember.id));
      updatedMembers += 1;
    } else {
      const [createdMember] = await db
        .insert(householdMembers)
        .values({
          householdId,
          firstName: data.memberFirstName,
          lastName: data.memberLastName,
          displayName: data.memberDisplayName,
          email: data.memberEmail ?? null,
          phone: data.memberPhone,
          relationship: data.relationship,
          isPrimary: data.isPrimary,
        })
        .returning({ id: householdMembers.id });

      if (!createdMember) {
        errors.push({ rowNumber, reason: "Failed to create household member" });
        continue;
      }

      memberId = createdMember.id;
      createdMembers += 1;
    }

    if (!data.memberEmail) {
      warnings.push({ rowNumber, reason: "Missing member email" });
    }

    if (!/^\d{4}-\d{4}$/.test(data.cycleLabel)) {
      warnings.push({ rowNumber, reason: `Unexpected cycle label format: ${data.cycleLabel}` });
    }

    const cycleStart = new Date(data.cycleStartIso);
    const cycleEnd = new Date(data.cycleEndIso);
    if (Number.isNaN(cycleStart.getTime()) || Number.isNaN(cycleEnd.getTime())) {
      errors.push({ rowNumber, reason: "Invalid cycle date(s)" });
      continue;
    }

    const [existingTerm] = await db
      .select({ id: membershipTerms.id })
      .from(membershipTerms)
      .where(and(eq(membershipTerms.householdId, householdId), eq(membershipTerms.cycleLabel, data.cycleLabel)))
      .limit(1);

    let termId = existingTerm?.id ?? 0;
    if (!existingTerm) {
      const [createdTerm] = await db
        .insert(membershipTerms)
        .values({
          householdId,
          cycleLabel: data.cycleLabel,
          cycleStart,
          cycleEnd,
          renewalStatus: data.renewalStatus,
          invitedAt: data.renewalStatus === "invited" ? new Date() : null,
          submittedAt: data.renewalStatus === "form_submitted" ? new Date() : null,
          activatedAt: data.renewalStatus === "active" ? new Date() : null,
        })
        .returning({ id: membershipTerms.id });

      if (!createdTerm) {
        errors.push({ rowNumber, reason: "Failed to create membership term" });
        continue;
      }

      termId = createdTerm.id;
      createdTerms += 1;
    }

    if (data.openingBalanceCents > 0) {
      const [existingOpeningInvoice] = await db
        .select({ id: duesInvoices.id })
        .from(duesInvoices)
        .where(
          and(
            eq(duesInvoices.householdId, householdId),
            eq(duesInvoices.membershipTermId, termId),
            eq(duesInvoices.label, "Opening Balance"),
          ),
        )
        .limit(1);

      if (!existingOpeningInvoice) {
        await db.insert(duesInvoices).values({
          householdId,
          membershipTermId: termId,
          label: "Opening Balance",
          amountCents: data.openingBalanceCents,
          paidCents: 0,
          status: "open",
          dueDate: cycleStart,
          notes: `Imported opening balance for ${data.cycleLabel} (member ${memberId})`,
        });
        createdOpeningInvoices += 1;
      }
    }
  }

  return {
    processedRows: rows.length,
    createdHouseholds,
    updatedHouseholds,
    createdMembers,
    updatedMembers,
    createdTerms,
    createdOpeningInvoices,
    errors,
    warnings,
  };
}
