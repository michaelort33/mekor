import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  MAILCHIMP_EXPORT_SOURCES,
  normalizeMailchimpEmail,
  normalizeMailchimpPhone,
  parseMailchimpAddress,
  parseMailchimpExportRoot,
} from "@/lib/mailchimp/export-import";

const HEADERS = [
  "Email Address",
  "First Name",
  "Last Name",
  "Address",
  "Birthdate",
  "Phone",
  "What emails from Mekor would you like to receive?",
  "Relationship with Mekor",
  "EMAIL_TYPE",
  "MEMBER_RATING",
  "OPTIN_TIME",
  "OPTIN_IP",
  "CONFIRM_TIME",
  "CONFIRM_IP",
  "GMTOFF",
  "DSTOFF",
  "TIMEZONE",
  "CC",
  "REGION",
  "LAST_CHANGED",
  "UNSUB_TIME",
  "UNSUB_CAMPAIGN_TITLE",
  "UNSUB_CAMPAIGN_ID",
  "UNSUB_REASON",
  "UNSUB_REASON_OTHER",
  "CLEAN_TIME",
  "CLEAN_CAMPAIGN_TITLE",
  "CLEAN_CAMPAIGN_ID",
  "LEID",
  "EUID",
  "NOTES",
  "TAGS",
];

function csvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function csvRow(values: Partial<Record<(typeof HEADERS)[number], string>>) {
  return HEADERS.map((header) => csvValue(values[header] ?? "")).join(",");
}

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "mailchimp-export-"));
  for (const source of MAILCHIMP_EXPORT_SOURCES) await mkdir(path.join(root, source.directory));
  const alice = {
    "Email Address": " Alice@Example.com ",
    "First Name": "Alice",
    "Last Name": "Member",
    Address: "10 Walnut St  Apt 2  Philadelphia  PA  19103  US",
    Phone: "'+12155550100",
    "What emails from Mekor would you like to receive?": "Weekly Shabbat Newsletter, Important announcements",
    "Relationship with Mekor": "Member",
    EMAIL_TYPE: "html",
    MEMBER_RATING: "5",
    OPTIN_TIME: "2024-01-01 10:00:00",
    CONFIRM_TIME: "2024-01-01 10:05:00",
    LEID: "main-leid",
    EUID: "email-euid",
    TAGS: "Contacted Me, Subscribers",
  } as const;
  const bob = {
    "Email Address": "bob@example.com",
    "First Name": "Bob",
    "Last Name": "Alumni",
    "Relationship with Mekor": "Former member",
    UNSUB_TIME: "2024-02-02 12:00:00",
    UNSUB_REASON: "NORMAL",
    LEID: "bob-main-leid",
    EUID: "bob-euid",
  } as const;

  const byDirectory: Record<string, { status: string; rows: Array<Record<string, string>> }> = {
    weekly_shabbat_newsletter: { status: "subscribed", rows: [alice] },
    members: { status: "subscribed", rows: [alice] },
    alumni: { status: "unsubscribed", rows: [bob] },
    kids: { status: "subscribed", rows: [alice] },
    members2: {
      status: "unsubscribed",
      rows: [{ ...alice, "First Name": "Alicia", LEID: "members2-leid", OPTIN_TIME: "2020-01-01 10:00:00", CONFIRM_TIME: "2020-01-01 10:05:00" }],
    },
  };

  for (const source of MAILCHIMP_EXPORT_SOURCES) {
    const fixture = byDirectory[source.directory]!;
    const fileName = `${fixture.status}_email_${source.exportKind}_export_${source.exportId}.csv`;
    const content = `${HEADERS.map(csvValue).join(",")}\n${fixture.rows.map(csvRow).join("\n")}\n`;
    await writeFile(path.join(root, source.directory, fileName), content);
  }
  return root;
}

test("Mailchimp contact values are normalized without discarding the original profile", () => {
  assert.equal(normalizeMailchimpEmail(" Person@Example.COM "), "person@example.com");
  assert.equal(normalizeMailchimpPhone("'+12155550100"), "+12155550100");
  assert.deepEqual(parseMailchimpAddress("717 S Hicks St    Philadelphia  PA  19146  US"), {
    addressRaw: "717 S Hicks St    Philadelphia  PA  19146  US",
    addressLine1: "717 S Hicks St",
    addressLine2: "",
    city: "Philadelphia",
    state: "PA",
    postalCode: "19146",
    country: "US",
  });
});

test("Mailchimp exports deduplicate people but preserve separate audience profiles and memberships", async () => {
  const root = await createFixture();
  try {
    const parsed = await parseMailchimpExportRoot(root);
    assert.equal(parsed.rows.length, 5);
    assert.equal(parsed.people.length, 2);
    assert.equal(parsed.contacts.length, 3);
    const alice = parsed.people.find((person) => person.email === "alice@example.com")!;
    assert.equal(alice.profiles.length, 2);
    assert.equal(alice.memberships.length, 4);
    assert.equal(alice.profile.firstName, "Alice");
    assert.equal(alice.status, "member");
    assert.equal(alice.profile.phone, "+12155550100");
    assert.deepEqual(
      parsed.topicPlans.filter((plan) => plan.email === alice.email).map((plan) => [plan.topic, plan.status]),
      [["announcements", "subscribed"], ["kids", "subscribed"], ["members", "subscribed"], ["weekly", "subscribed"]],
    );
    const bob = parsed.people.find((person) => person.email === "bob@example.com")!;
    assert.equal(bob.status, "inactive");
    assert.equal(parsed.topicPlans.some((plan) => plan.email === bob.email), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Mailchimp parser rejects duplicate rows inside a single source export", async () => {
  const root = await createFixture();
  try {
    const source = MAILCHIMP_EXPORT_SOURCES[0];
    const fileName = `subscribed_email_${source.exportKind}_export_${source.exportId}.csv`;
    const filePath = path.join(root, source.directory, fileName);
    const row = csvRow({ "Email Address": "duplicate@example.com", LEID: "dup", EUID: "dup" });
    await writeFile(filePath, `${HEADERS.map(csvValue).join(",")}\n${row}\n${row}\n`);
    await assert.rejects(() => parseMailchimpExportRoot(root), /Duplicate rows inside a Mailchimp source/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
