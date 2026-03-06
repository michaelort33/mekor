import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDefaultMembershipApprovalPlan,
  buildApplicantDisplayName,
  calculateMembershipEstimate,
  membershipApprovalPlanSchema,
  membershipApplicationSchema,
} from "../lib/membership/applications";
import { sendMembershipApprovalEmail } from "../lib/membership/applications-email";

test("membership estimate includes optional security donation", () => {
  assert.deepEqual(
    calculateMembershipEstimate({ membershipCategory: "single", includeSecurityDonation: true }),
    {
      baseAmountCents: 100_000,
      securityDonationCents: 10_000,
      totalAmountCents: 110_000,
    },
  );
  assert.deepEqual(
    calculateMembershipEstimate({ membershipCategory: "student", includeSecurityDonation: false }),
    {
      baseAmountCents: 50_000,
      securityDonationCents: 0,
      totalAmountCents: 50_000,
    },
  );
});

test("membership application schema normalizes repeatable rows", () => {
  const parsed = membershipApplicationSchema.parse({
    applicationType: "new",
    membershipCategory: "couple_family",
    includeSecurityDonation: true,
    coverOnlineFees: false,
    preferredPaymentMethod: "venmo",
    firstName: "Leah",
    lastName: "Cohen",
    hebrewName: "",
    email: "leah@example.com",
    phone: "2155551212",
    addressLine1: "1500 Walnut St",
    addressLine2: "",
    city: "Philadelphia",
    state: "PA",
    postalCode: "19102",
    spouseFirstName: "",
    spouseLastName: "",
    spouseHebrewName: "",
    spouseEmail: "",
    spousePhone: "",
    householdMembers: [
      { name: "", hebrewName: "", relationship: "" },
      { name: "Ari Cohen", hebrewName: "", relationship: "Child" },
    ],
    yahrzeits: [
      { name: "", relationship: "", hebrewDate: "", englishDate: "" },
      { name: "Moshe Cohen", relationship: "Father", hebrewDate: "10 Nissan", englishDate: "" },
    ],
    volunteerInterests: ["Hospitality and Shabbat meals", "Hospitality and Shabbat meals"],
    notes: "",
    sourcePath: "/membership/apply",
  });

  assert.equal(buildApplicantDisplayName(parsed), "Leah Cohen");
  assert.equal(parsed.householdMembers.length, 1);
  assert.equal(parsed.yahrzeits.length, 1);
  assert.deepEqual(parsed.volunteerInterests, ["Hospitality and Shabbat meals"]);
});

test("membership approval workbench defaults to invoice and spouse lead when available", () => {
  const plan = buildDefaultMembershipApprovalPlan({
    totalAmountCents: 110_000,
    spouseEmail: "spouse@example.com",
    now: new Date("2026-03-06T15:30:00.000Z"),
  });

  assert.deepEqual(plan, {
    membershipStartDate: "2026-03-06",
    membershipRenewalDate: "2027-03-06",
    billingMode: "invoice",
    invoiceLabel: "Membership dues",
    invoiceAmountCents: 110_000,
    invoiceDueDate: "2026-03-06",
    scheduleFrequency: "annual",
    scheduleAmountCents: 110_000,
    scheduleNextDueDate: "2026-03-06",
    scheduleNotes: "Created from membership application approval",
    createSpouseLead: true,
  });
});

test("membership approval plan schema requires valid billing details", () => {
  const result = membershipApprovalPlanSchema.safeParse({
    membershipStartDate: "2026-03-06",
    membershipRenewalDate: "2026-03-05",
    billingMode: "invoice",
    invoiceLabel: "Membership dues",
    invoiceAmountCents: 0,
    invoiceDueDate: "2026-03-05",
    scheduleFrequency: "annual",
    scheduleAmountCents: 110_000,
    scheduleNextDueDate: "2026-03-06",
    scheduleNotes: "",
    createSpouseLead: false,
  });

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }

  const issues = result.error.issues.map((issue) => issue.path.join("."));
  assert.ok(issues.includes("membershipRenewalDate"));
  assert.ok(issues.includes("invoiceAmountCents"));
  assert.ok(issues.includes("invoiceDueDate"));
});

test("membership approval emails are sent through SendGrid", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.SENDGRID_API_KEY;
  const originalFrom = process.env.SENDGRID_FROM_EMAIL;

  const calls: Array<{ url: string; init?: RequestInit }> = [];
  process.env.SENDGRID_API_KEY = "SG.test-key";
  process.env.SENDGRID_FROM_EMAIL = "admin@mekorhabracha.org";
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
      init,
    });
    return new Response(null, {
      status: 202,
      headers: { "x-message-id": "msg_approval" },
    });
  };

  try {
    await sendMembershipApprovalEmail({
      toEmail: "applicant@example.com",
      firstName: "Leah",
      membershipLabel: "Couple/Family Membership",
      loginUrl: "https://mekor.test/login",
      acceptUrl: "https://mekor.test/invite/accept?token=welcome123",
    });
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SENDGRID_API_KEY = originalApiKey;
    process.env.SENDGRID_FROM_EMAIL = originalFrom;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://api.sendgrid.com/v3/mail/send");
  const body = JSON.parse(String(calls[0]?.init?.body));
  assert.equal(body.personalizations[0].to[0].email, "applicant@example.com");
  assert.equal(body.subject, "[Mekor] Welcome to Mekor Habracha");
  assert.match(body.content[0].value, /welcome123/);
});
