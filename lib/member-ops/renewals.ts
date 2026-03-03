import crypto from "node:crypto";

import { and, eq, gt, sql } from "drizzle-orm";
import { type z } from "zod";

import { getDb } from "@/db/client";
import {
  communicationPreferences,
  duesInvoices,
  householdAccessTokens,
  householdMembers,
  membershipTerms,
} from "@/db/schema";
import type { CommunicationPreferenceInput } from "@/lib/member-ops/contracts";
import { commChannelSchema, renewalStatusSchema } from "@/lib/member-ops/contracts";

type RenewalStatus = z.infer<typeof renewalStatusSchema>;

const TRANSITIONS: Record<RenewalStatus, RenewalStatus[]> = {
  not_started: ["invited", "form_submitted", "on_hold"],
  invited: ["form_submitted", "on_hold"],
  form_submitted: ["payment_pending", "active", "on_hold"],
  payment_pending: ["active", "on_hold"],
  active: ["on_hold"],
  on_hold: ["invited", "form_submitted", "payment_pending", "active"],
};

function currentCycleWindow(anchor: Date) {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const cycleStartYear = month >= 8 ? year : year - 1;
  const cycleEndYear = cycleStartYear + 1;

  return {
    label: `${cycleStartYear}-${cycleEndYear}`,
    start: new Date(Date.UTC(cycleStartYear, 8, 1, 0, 0, 0)),
    end: new Date(Date.UTC(cycleEndYear, 7, 31, 23, 59, 59)),
  };
}

export function hashHouseholdAccessToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createHouseholdAccessToken(
  householdId: number,
  purpose = "renewal",
  expiresInHours = 24 * 30,
) {
  const db = getDb();
  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = hashHouseholdAccessToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await db.insert(householdAccessTokens).values({
    householdId,
    tokenHash,
    purpose,
    expiresAt,
  });

  return rawToken;
}

export async function verifyHouseholdAccessToken(token: string, purpose = "renewal") {
  const db = getDb();
  const tokenHash = hashHouseholdAccessToken(token);

  const [row] = await db
    .select({
      id: householdAccessTokens.id,
      householdId: householdAccessTokens.householdId,
      purpose: householdAccessTokens.purpose,
      expiresAt: householdAccessTokens.expiresAt,
      usedAt: householdAccessTokens.usedAt,
    })
    .from(householdAccessTokens)
    .where(
      and(
        eq(householdAccessTokens.tokenHash, tokenHash),
        eq(householdAccessTokens.purpose, purpose),
        gt(householdAccessTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row || row.usedAt) {
    return null;
  }

  return row;
}

export async function ensureCurrentCycleTerm(householdId: number, now = new Date()) {
  const db = getDb();
  const cycle = currentCycleWindow(now);

  const [existing] = await db
    .select()
    .from(membershipTerms)
    .where(and(eq(membershipTerms.householdId, householdId), eq(membershipTerms.cycleLabel, cycle.label)))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(membershipTerms)
    .values({
      householdId,
      cycleLabel: cycle.label,
      cycleStart: cycle.start,
      cycleEnd: cycle.end,
      renewalStatus: "invited",
      invitedAt: now,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create current membership cycle");
  }

  return created;
}

export async function transitionRenewalStatus(termId: number, nextStatus: RenewalStatus) {
  const db = getDb();
  const [current] = await db
    .select({ id: membershipTerms.id, renewalStatus: membershipTerms.renewalStatus })
    .from(membershipTerms)
    .where(eq(membershipTerms.id, termId))
    .limit(1);

  if (!current) {
    throw new Error("Membership term not found");
  }

  const allowed = TRANSITIONS[current.renewalStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Invalid renewal transition: ${current.renewalStatus} -> ${nextStatus}`);
  }

  const now = new Date();
  const [updated] = await db
    .update(membershipTerms)
    .set({
      renewalStatus: nextStatus,
      submittedAt: nextStatus === "form_submitted" ? now : null,
      activatedAt: nextStatus === "active" ? now : null,
      updatedAt: now,
    })
    .where(eq(membershipTerms.id, termId))
    .returning();

  if (!updated) {
    throw new Error("Failed to transition renewal status");
  }

  return updated;
}

async function pendingInvoiceBalanceForHousehold(householdId: number) {
  const db = getDb();
  const [row] = await db
    .select({
      outstandingCents:
        sql<number>`COALESCE(SUM(CASE WHEN ${duesInvoices.amountCents} - ${duesInvoices.paidCents} > 0 THEN ${duesInvoices.amountCents} - ${duesInvoices.paidCents} ELSE 0 END), 0)`,
    })
    .from(duesInvoices)
    .where(eq(duesInvoices.householdId, householdId));

  return row?.outstandingCents ?? 0;
}

async function upsertCommunicationPrefs(
  memberId: number,
  updates: Pick<CommunicationPreferenceInput, "channel" | "optIn">[],
  source: string,
) {
  if (updates.length === 0) {
    return;
  }

  const db = getDb();
  const now = new Date();

  for (const update of updates) {
    const channel = commChannelSchema.parse(update.channel);
    await db
      .insert(communicationPreferences)
      .values({
        memberId,
        channel,
        optIn: update.optIn,
        consentCapturedAt: now,
        source,
        updatedBy: "renewal_submit",
      })
      .onConflictDoUpdate({
        target: [communicationPreferences.memberId, communicationPreferences.channel],
        set: {
          optIn: update.optIn,
          consentCapturedAt: now,
          source,
          updatedBy: "renewal_submit",
          updatedAt: now,
        },
      });
  }
}

export async function submitRenewalWithToken(input: {
  token: string;
  planLabel: string;
  notes: string;
  communication: Array<Pick<CommunicationPreferenceInput, "channel" | "optIn">>;
}) {
  const tokenRow = await verifyHouseholdAccessToken(input.token, "renewal");
  if (!tokenRow) {
    throw new Error("Invalid or expired renewal token");
  }

  const db = getDb();
  const now = new Date();
  const term = await ensureCurrentCycleTerm(tokenRow.householdId, now);

  const [updated] = await db
    .update(membershipTerms)
    .set({
      planLabel: input.planLabel,
      notes: input.notes,
      renewalStatus: "form_submitted",
      submittedAt: now,
      updatedAt: now,
    })
    .where(eq(membershipTerms.id, term.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to submit renewal");
  }

  const [primaryMember] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, tokenRow.householdId), eq(householdMembers.isPrimary, true)))
    .limit(1);

  if (primaryMember) {
    await upsertCommunicationPrefs(primaryMember.id, input.communication, "renewal_submit");
  }

  const outstandingCents = await pendingInvoiceBalanceForHousehold(tokenRow.householdId);
  const finalStatus: RenewalStatus = outstandingCents > 0 ? "payment_pending" : "active";

  const [finalized] = await db
    .update(membershipTerms)
    .set({
      renewalStatus: finalStatus,
      activatedAt: finalStatus === "active" ? now : null,
      updatedAt: now,
    })
    .where(eq(membershipTerms.id, term.id))
    .returning();

  await db.update(householdAccessTokens).set({ usedAt: now }).where(eq(householdAccessTokens.id, tokenRow.id));

  if (!finalized) {
    throw new Error("Failed to finalize renewal status");
  }

  return {
    householdId: tokenRow.householdId,
    termId: finalized.id,
    renewalStatus: finalized.renewalStatus,
    outstandingCents,
  };
}
