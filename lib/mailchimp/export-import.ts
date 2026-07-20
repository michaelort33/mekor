import { createHash, randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "csv-parse/sync";

export const MAILCHIMP_EXPORT_SOURCES = [
  {
    directory: "weekly_shabbat_newsletter",
    audienceKey: "main",
    audienceLabel: "Main Mailchimp audience",
    segmentKey: "weekly_shabbat_newsletter",
    segmentLabel: "Weekly Shabbat Newsletter",
    exportKind: "segment",
    exportId: "98a668c143",
    topic: "weekly",
  },
  {
    directory: "members",
    audienceKey: "main",
    audienceLabel: "Main Mailchimp audience",
    segmentKey: "members",
    segmentLabel: "Members",
    exportKind: "segment",
    exportId: "99c5db5458",
    topic: "members",
  },
  {
    directory: "alumni",
    audienceKey: "main",
    audienceLabel: "Main Mailchimp audience",
    segmentKey: "alumni",
    segmentLabel: "Alumni",
    exportKind: "segment",
    exportId: "b31dde5d98",
    topic: null,
  },
  {
    directory: "kids",
    audienceKey: "main",
    audienceLabel: "Main Mailchimp audience",
    segmentKey: "kids",
    segmentLabel: "MekorKids",
    exportKind: "segment",
    exportId: "dd575b7733",
    topic: "kids",
  },
  {
    directory: "members2",
    audienceKey: "members2",
    audienceLabel: "Members (separate Mailchimp audience)",
    segmentKey: "entire_audience",
    segmentLabel: "Entire audience",
    exportKind: "audience",
    exportId: "433eae56f5",
    topic: null,
  },
] as const;

export const MAILCHIMP_EXPORT_STATUSES = ["subscribed", "unsubscribed", "cleaned", "nonsubscribed"] as const;
export type MailchimpExportStatus = (typeof MAILCHIMP_EXPORT_STATUSES)[number];

export const MAILCHIMP_NEWSLETTER_TOPICS = ["weekly", "announcements", "events", "kids", "members"] as const;
export type MailchimpNewsletterTopic = (typeof MAILCHIMP_NEWSLETTER_TOPICS)[number];
export type NativeNewsletterStatus = "subscribed" | "unsubscribed" | "bounced";

export type MailchimpRawRow = Record<string, string>;

export type MailchimpExportRow = {
  audienceKey: string;
  audienceLabel: string;
  segmentKey: string;
  segmentLabel: string;
  segmentTopic: MailchimpNewsletterTopic | null;
  exportId: string;
  exportStatus: MailchimpExportStatus;
  sourceFileName: string;
  sourceRelativePath: string;
  email: string;
  raw: MailchimpRawRow;
};

export type ParsedMailchimpContact = {
  audienceKey: string;
  audienceLabel: string;
  exportStatus: MailchimpExportStatus;
  email: string;
  euid: string;
  leid: string;
  firstName: string;
  lastName: string;
  addressRaw: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneRaw: string;
  phone: string;
  birthdate: string;
  emailType: string;
  memberRating: number | null;
  optinTime: Date | null;
  optinIp: string;
  confirmTime: Date | null;
  confirmIp: string;
  gmtOffset: string;
  dstOffset: string;
  timezone: string;
  countryCode: string;
  region: string;
  lastChangedAt: Date | null;
  unsubscribedAt: Date | null;
  unsubscribeCampaignTitle: string;
  unsubscribeCampaignId: string;
  unsubscribeReason: string;
  unsubscribeReasonOther: string;
  cleanedAt: Date | null;
  cleanCampaignTitle: string;
  cleanCampaignId: string;
  interests: string[];
  relationships: string[];
  tags: string[];
  notes: string;
  sourceFiles: string[];
  raw: MailchimpRawRow;
};

export type MailchimpPersonPlan = {
  email: string;
  profile: ParsedMailchimpContact;
  profiles: ParsedMailchimpContact[];
  memberships: MailchimpExportRow[];
  displayName: string;
  status: "lead" | "member" | "inactive";
  tags: string[];
};

export type MailchimpTopicPlan = {
  email: string;
  topic: MailchimpNewsletterTopic;
  status: NativeNewsletterStatus;
  sourceStatus: MailchimpExportStatus;
  sourceLabels: string[];
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  lastProviderEventAt: Date | null;
  unsubscribeToken: string;
};

export type MailchimpExportManifestEntry = {
  relativePath: string;
  sha256: string;
  rowCount: number;
  audienceKey: string;
  segmentKey: string;
  exportStatus: MailchimpExportStatus;
};

export type ParsedMailchimpExport = {
  fingerprint: string;
  rows: MailchimpExportRow[];
  contacts: ParsedMailchimpContact[];
  people: MailchimpPersonPlan[];
  topicPlans: MailchimpTopicPlan[];
  manifest: MailchimpExportManifestEntry[];
  summary: ReturnType<typeof summarizeMailchimpExport>;
};

const STATUS_FILE_PATTERN = /^(subscribed|unsubscribed|cleaned|nonsubscribed)_email_(segment|audience)_export_([a-z0-9]+)\.csv$/;

const INTEREST_TOPIC_MAP: Record<string, MailchimpNewsletterTopic> = {
  "Weekly Shabbat Newsletter": "weekly",
  "Important announcements": "announcements",
  "Events and activities": "events",
  MekorKids: "kids",
};

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export function normalizeMailchimpEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeMailchimpPhone(value: string) {
  return value.trim().replace(/^'/, "");
}

export function splitMailchimpList(value: string | undefined) {
  return clean(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseMailchimpTimestamp(value: string | undefined) {
  const raw = clean(value);
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(raw);
  if (!match) throw new Error(`Unsupported Mailchimp timestamp: ${raw}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])));
}

export function parseMailchimpAddress(value: string | undefined) {
  const raw = clean(value);
  if (!raw) {
    return { addressRaw: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", country: "" };
  }
  const parts = raw.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 5) {
    const [addressLine1, city, state, postalCode, country] = parts;
    return { addressRaw: raw, addressLine1, addressLine2: "", city, state, postalCode, country };
  }
  if (parts.length === 6) {
    const [addressLine1, addressLine2, city, state, postalCode, country] = parts;
    return { addressRaw: raw, addressLine1, addressLine2, city, state, postalCode, country };
  }
  throw new Error(`Unsupported Mailchimp address shape (${parts.length} parts): ${raw}`);
}

function displayName(firstName: string, lastName: string, email: string) {
  if (!firstName) return lastName || email;
  if (!lastName || firstName.toLowerCase().endsWith(lastName.toLowerCase())) return firstName;
  return `${firstName} ${lastName}`;
}

function profileScore(raw: MailchimpRawRow) {
  return Object.values(raw).filter((value) => clean(value)).length;
}

function parseContact(rows: MailchimpExportRow[]): ParsedMailchimpContact {
  const first = rows[0];
  if (!first) throw new Error("Mailchimp contact requires at least one row");
  const statuses = new Set(rows.map((row) => row.exportStatus));
  if (statuses.size !== 1) {
    throw new Error(`Conflicting Mailchimp statuses inside audience ${first.audienceKey} for ${first.email}`);
  }
  const euids = new Set(rows.map((row) => clean(row.raw.EUID)).filter(Boolean));
  const leids = new Set(rows.map((row) => clean(row.raw.LEID)).filter(Boolean));
  if (euids.size > 1 || leids.size > 1) {
    throw new Error(`Conflicting Mailchimp provider IDs inside audience ${first.audienceKey} for ${first.email}`);
  }
  const richest = [...rows].sort((left, right) => profileScore(right.raw) - profileScore(left.raw))[0]!;
  const raw = richest.raw;
  const address = parseMailchimpAddress(raw.Address);
  const rating = clean(raw.MEMBER_RATING);
  return {
    audienceKey: first.audienceKey,
    audienceLabel: first.audienceLabel,
    exportStatus: first.exportStatus,
    email: first.email,
    euid: [...euids][0] ?? "",
    leid: [...leids][0] ?? "",
    firstName: clean(raw["First Name"]),
    lastName: clean(raw["Last Name"]),
    ...address,
    phoneRaw: clean(raw.Phone),
    phone: normalizeMailchimpPhone(raw.Phone ?? ""),
    birthdate: clean(raw.Birthdate),
    emailType: clean(raw.EMAIL_TYPE),
    memberRating: rating ? Number.parseInt(rating, 10) : null,
    optinTime: parseMailchimpTimestamp(raw.OPTIN_TIME),
    optinIp: clean(raw.OPTIN_IP),
    confirmTime: parseMailchimpTimestamp(raw.CONFIRM_TIME),
    confirmIp: clean(raw.CONFIRM_IP),
    gmtOffset: clean(raw.GMTOFF),
    dstOffset: clean(raw.DSTOFF),
    timezone: clean(raw.TIMEZONE),
    countryCode: clean(raw.CC),
    region: clean(raw.REGION),
    lastChangedAt: parseMailchimpTimestamp(raw.LAST_CHANGED),
    unsubscribedAt: parseMailchimpTimestamp(raw.UNSUB_TIME),
    unsubscribeCampaignTitle: clean(raw.UNSUB_CAMPAIGN_TITLE),
    unsubscribeCampaignId: clean(raw.UNSUB_CAMPAIGN_ID),
    unsubscribeReason: clean(raw.UNSUB_REASON),
    unsubscribeReasonOther: clean(raw.UNSUB_REASON_OTHER),
    cleanedAt: parseMailchimpTimestamp(raw.CLEAN_TIME),
    cleanCampaignTitle: clean(raw.CLEAN_CAMPAIGN_TITLE),
    cleanCampaignId: clean(raw.CLEAN_CAMPAIGN_ID),
    interests: splitMailchimpList(raw["What emails from Mekor would you like to receive?"]),
    relationships: splitMailchimpList(raw["Relationship with Mekor"]),
    tags: splitMailchimpList(raw.TAGS),
    notes: clean(raw.NOTES),
    sourceFiles: [...new Set(rows.map((row) => row.sourceFileName))].sort(),
    raw,
  };
}

function nativeStatus(status: MailchimpExportStatus): NativeNewsletterStatus {
  if (status === "subscribed") return "subscribed";
  if (status === "cleaned") return "bounced";
  return "unsubscribed";
}

function latestDate(values: Array<Date | null>) {
  return values.filter((value): value is Date => value !== null).sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
}

function topicEventDate(contact: ParsedMailchimpContact) {
  if (contact.exportStatus === "cleaned") return contact.cleanedAt ?? contact.lastChangedAt ?? contact.confirmTime ?? contact.optinTime;
  if (contact.exportStatus === "unsubscribed") return contact.unsubscribedAt ?? contact.lastChangedAt ?? contact.confirmTime ?? contact.optinTime;
  return contact.lastChangedAt ?? contact.confirmTime ?? contact.optinTime;
}

function buildTopicPlans(contacts: ParsedMailchimpContact[], rows: MailchimpExportRow[]) {
  const contactByAudienceEmail = new Map(contacts.map((contact) => [`${contact.audienceKey}\0${contact.email}`, contact]));
  const sourcesByEmailTopic = new Map<string, Array<{ label: string; contact: ParsedMailchimpContact }>>();
  const add = (email: string, topic: MailchimpNewsletterTopic, label: string, contact: ParsedMailchimpContact) => {
    const key = `${email}\0${topic}`;
    const values = sourcesByEmailTopic.get(key) ?? [];
    if (!values.some((value) => value.label === label)) values.push({ label, contact });
    sourcesByEmailTopic.set(key, values);
  };

  for (const row of rows) {
    if (row.audienceKey !== "main" || !row.segmentTopic) continue;
    const contact = contactByAudienceEmail.get(`${row.audienceKey}\0${row.email}`)!;
    add(row.email, row.segmentTopic, `segment:${row.segmentKey}`, contact);
  }
  for (const contact of contacts) {
    if (contact.audienceKey !== "main") continue;
    for (const interest of contact.interests) {
      const topic = INTEREST_TOPIC_MAP[interest];
      if (topic) add(contact.email, topic, `interest:${interest}`, contact);
    }
  }

  return [...sourcesByEmailTopic.entries()].map(([key, sources]) => {
    const [email, topic] = key.split("\0") as [string, MailchimpNewsletterTopic];
    const statuses = new Set(sources.map(({ contact }) => contact.exportStatus));
    if (statuses.size !== 1) throw new Error(`Conflicting Mailchimp topic statuses for ${email} / ${topic}`);
    const contact = sources[0]!.contact;
    const status = nativeStatus(contact.exportStatus);
    return {
      email,
      topic,
      status,
      sourceStatus: contact.exportStatus,
      sourceLabels: sources.map(({ label }) => label).sort(),
      confirmedAt: status === "subscribed" ? contact.confirmTime ?? contact.optinTime : null,
      unsubscribedAt: status === "unsubscribed" ? contact.unsubscribedAt ?? contact.lastChangedAt : null,
      lastProviderEventAt: latestDate(sources.map(({ contact: sourceContact }) => topicEventDate(sourceContact))),
      unsubscribeToken: randomBytes(32).toString("base64url"),
    } satisfies MailchimpTopicPlan;
  }).sort((left, right) => left.email.localeCompare(right.email) || left.topic.localeCompare(right.topic));
}

function buildPeople(contacts: ParsedMailchimpContact[], rows: MailchimpExportRow[]) {
  const contactsByEmail = Map.groupBy(contacts, (contact) => contact.email);
  const membershipsByEmail = Map.groupBy(rows, (row) => row.email);
  return [...contactsByEmail.entries()].map(([email, profiles]) => {
    const profile = profiles.find((candidate) => candidate.audienceKey === "main") ?? profiles[0]!;
    const memberships = membershipsByEmail.get(email) ?? [];
    const relationships = new Set(profiles.flatMap((candidate) => candidate.relationships));
    const status = relationships.has("Member") ? "member" : relationships.has("Former member") ? "inactive" : "lead";
    const tags = [
      "mailchimp",
      ...new Set(memberships.filter((row) => row.segmentKey !== "entire_audience").map((row) => `mailchimp:${row.segmentKey.replace("_shabbat_newsletter", "")}`)),
    ];
    return {
      email,
      profile,
      profiles: [...profiles].sort((left, right) => left.audienceKey.localeCompare(right.audienceKey)),
      memberships: [...memberships].sort((left, right) => left.audienceKey.localeCompare(right.audienceKey) || left.segmentKey.localeCompare(right.segmentKey)),
      displayName: displayName(profile.firstName, profile.lastName, email),
      status,
      tags,
    } satisfies MailchimpPersonPlan;
  }).sort((left, right) => left.email.localeCompare(right.email));
}

export function summarizeMailchimpExport(input: {
  rows: MailchimpExportRow[];
  contacts: ParsedMailchimpContact[];
  people: MailchimpPersonPlan[];
  topicPlans: MailchimpTopicPlan[];
}) {
  const count = <T>(values: T[], key: (value: T) => string) => Object.fromEntries(
    [...Map.groupBy(values, key).entries()].sort(([left], [right]) => left.localeCompare(right)).map(([group, rows]) => [group, rows.length]),
  );
  return {
    totalRows: input.rows.length,
    uniquePeople: input.people.length,
    audienceContacts: count(input.contacts, (contact) => contact.audienceKey),
    segmentRows: count(input.rows, (row) => `${row.segmentKey}:${row.exportStatus}`),
    audienceStatuses: count(input.contacts, (contact) => `${contact.audienceKey}:${contact.exportStatus}`),
    topicStatuses: count(input.topicPlans, (plan) => `${plan.topic}:${plan.status}`),
  };
}

export async function parseMailchimpExportRoot(exportRoot: string): Promise<ParsedMailchimpExport> {
  const rows: MailchimpExportRow[] = [];
  const manifest: MailchimpExportManifestEntry[] = [];

  for (const source of MAILCHIMP_EXPORT_SOURCES) {
    const directoryPath = path.join(exportRoot, source.directory);
    const fileNames = (await readdir(directoryPath)).filter((fileName) => fileName.endsWith(".csv")).sort();
    if (fileNames.length === 0) throw new Error(`No Mailchimp CSV files found in ${directoryPath}`);
    for (const fileName of fileNames) {
      const match = STATUS_FILE_PATTERN.exec(fileName);
      if (!match) throw new Error(`Unexpected Mailchimp export file name: ${fileName}`);
      const [, rawStatus, exportKind, exportId] = match;
      if (exportKind !== source.exportKind || exportId !== source.exportId) {
        throw new Error(`Mailchimp export identity mismatch: ${fileName}`);
      }
      const exportStatus = rawStatus as MailchimpExportStatus;
      const relativePath = path.join(source.directory, fileName);
      const buffer = await readFile(path.join(directoryPath, fileName));
      const parsed = parse(buffer, { bom: true, columns: true, skip_empty_lines: true, relax_column_count: false }) as MailchimpRawRow[];
      for (const raw of parsed) {
        const email = normalizeMailchimpEmail(raw["Email Address"] ?? "");
        if (!email) throw new Error(`Missing email address in ${relativePath}`);
        rows.push({
          audienceKey: source.audienceKey,
          audienceLabel: source.audienceLabel,
          segmentKey: source.segmentKey,
          segmentLabel: source.segmentLabel,
          segmentTopic: source.topic,
          exportId: source.exportId,
          exportStatus,
          sourceFileName: fileName,
          sourceRelativePath: relativePath,
          email,
          raw,
        });
      }
      manifest.push({
        relativePath,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        rowCount: parsed.length,
        audienceKey: source.audienceKey,
        segmentKey: source.segmentKey,
        exportStatus,
      });
    }
  }

  const duplicateSourceRows = [...Map.groupBy(rows, (row) => `${row.audienceKey}\0${row.segmentKey}\0${row.email}`).entries()]
    .filter(([, duplicates]) => duplicates.length > 1);
  if (duplicateSourceRows.length > 0) throw new Error(`Duplicate rows inside a Mailchimp source: ${duplicateSourceRows[0]![0]}`);

  const contacts = [...Map.groupBy(rows, (row) => `${row.audienceKey}\0${row.email}`).values()].map(parseContact);
  const people = buildPeople(contacts, rows);
  const topicPlans = buildTopicPlans(contacts, rows);
  const fingerprint = createHash("sha256")
    .update(manifest.map((entry) => `${entry.relativePath}:${entry.sha256}`).join("\n"))
    .digest("hex");
  const summary = summarizeMailchimpExport({ rows, contacts, people, topicPlans });
  return { fingerprint, rows, contacts, people, topicPlans, manifest, summary };
}
