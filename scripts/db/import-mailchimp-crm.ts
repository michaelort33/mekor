import { config as loadEnv } from "dotenv";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  communicationPreferences,
  contactMethods,
  mailchimpContacts,
  mailchimpImportRuns,
  mailchimpSegmentMemberships,
  messageSuppressions,
  newsletterSubscriptions,
  people,
} from "@/db/schema";
import {
  type MailchimpPersonPlan,
  type ParsedMailchimpContact,
  type ParsedMailchimpExport,
  parseMailchimpExportRoot,
} from "@/lib/mailchimp/export-import";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

type ExistingPerson = {
  id: number;
  userId: number | null;
  status: "lead" | "invited" | "visitor" | "guest" | "member" | "admin" | "super_admin" | "inactive";
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  city: string;
  source: string;
  tags: string[];
  emailOptIn: boolean | null;
  doNotContact: boolean | null;
};

type ExistingSubscription = {
  id: number;
  personId: number;
  topic: string;
  status: "pending" | "subscribed" | "unsubscribed" | "bounced" | "complained";
  source: string;
  updatedAt: Date;
};

function args() {
  const values = process.argv.slice(2);
  const exportRootIndex = values.indexOf("--export-root");
  if (exportRootIndex === -1 || !values[exportRootIndex + 1]) {
    throw new Error("Usage: npm run db:import:mailchimp-crm -- --export-root /path/to/export [--apply]");
  }
  return { exportRoot: values[exportRootIndex + 1]!, apply: values.includes("--apply") };
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function mergeTags(existing: string[], imported: string[]) {
  return [...new Set([...existing, ...imported])].slice(0, 20);
}

function personPatch(existing: ExistingPerson, plan: MailchimpPersonPlan) {
  const profile = plan.profile;
  const canUseImportedStatus = existing.userId === null && (existing.source === "mailchimp_import" || ["lead", "guest"].includes(existing.status));
  const displayIsPlaceholder = !existing.displayName || existing.displayName.toLowerCase() === existing.email.toLowerCase();
  return {
    status: canUseImportedStatus ? plan.status : existing.status,
    firstName: existing.firstName || profile.firstName,
    lastName: existing.lastName || profile.lastName,
    displayName: displayIsPlaceholder ? plan.displayName : existing.displayName,
    phone: existing.phone || profile.phone,
    city: existing.city || profile.city,
    tags: mergeTags(existing.tags, plan.tags),
  };
}

function importedPersonValues(plan: MailchimpPersonPlan, now: Date) {
  return {
    status: plan.status,
    firstName: plan.profile.firstName,
    lastName: plan.profile.lastName,
    displayName: plan.displayName,
    email: plan.email,
    phone: plan.profile.phone,
    city: plan.profile.city,
    source: "mailchimp_import",
    tags: plan.tags,
    createdAt: now,
    updatedAt: now,
  };
}

function contactValues(contact: ParsedMailchimpContact, personId: number, importRunId: number, now: Date) {
  return {
    personId,
    lastImportRunId: importRunId,
    audienceKey: contact.audienceKey,
    audienceLabel: contact.audienceLabel,
    exportStatus: contact.exportStatus,
    email: contact.email,
    euid: contact.euid,
    leid: contact.leid,
    firstName: contact.firstName,
    lastName: contact.lastName,
    addressRaw: contact.addressRaw,
    addressLine1: contact.addressLine1,
    addressLine2: contact.addressLine2,
    city: contact.city,
    state: contact.state,
    postalCode: contact.postalCode,
    country: contact.country,
    phoneRaw: contact.phoneRaw,
    birthdate: contact.birthdate,
    emailType: contact.emailType,
    memberRating: contact.memberRating,
    optinTime: contact.optinTime,
    optinIp: contact.optinIp,
    confirmTime: contact.confirmTime,
    confirmIp: contact.confirmIp,
    gmtOffset: contact.gmtOffset,
    dstOffset: contact.dstOffset,
    timezone: contact.timezone,
    countryCode: contact.countryCode,
    region: contact.region,
    lastChangedAt: contact.lastChangedAt,
    unsubscribedAt: contact.unsubscribedAt,
    unsubscribeCampaignTitle: contact.unsubscribeCampaignTitle,
    unsubscribeCampaignId: contact.unsubscribeCampaignId,
    unsubscribeReason: contact.unsubscribeReason,
    unsubscribeReasonOther: contact.unsubscribeReasonOther,
    cleanedAt: contact.cleanedAt,
    cleanCampaignTitle: contact.cleanCampaignTitle,
    cleanCampaignId: contact.cleanCampaignId,
    interests: contact.interests,
    relationships: contact.relationships,
    tags: contact.tags,
    notes: contact.notes,
    sourceFiles: contact.sourceFiles,
    rawJson: contact.raw,
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

async function loadExistingPeople(parsed: ParsedMailchimpExport) {
  const rows: ExistingPerson[] = [];
  for (const emails of chunks(parsed.people.map((plan) => plan.email), 500)) {
    rows.push(...await getDb()
      .select({
        id: people.id,
        userId: people.userId,
        status: people.status,
        firstName: people.firstName,
        lastName: people.lastName,
        displayName: people.displayName,
        email: people.email,
        phone: people.phone,
        city: people.city,
        source: people.source,
        tags: people.tags,
        emailOptIn: communicationPreferences.emailOptIn,
        doNotContact: communicationPreferences.doNotContact,
      })
      .from(people)
      .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
      .where(inArray(people.email, emails)));
  }
  return rows;
}

async function loadExistingSubscriptions(personIds: number[]) {
  const rows: ExistingSubscription[] = [];
  for (const ids of chunks(personIds, 500)) {
    rows.push(...await getDb()
      .select({
        id: newsletterSubscriptions.id,
        personId: newsletterSubscriptions.personId,
        topic: newsletterSubscriptions.topic,
        status: newsletterSubscriptions.status,
        source: newsletterSubscriptions.source,
        updatedAt: newsletterSubscriptions.updatedAt,
      })
      .from(newsletterSubscriptions)
      .where(inArray(newsletterSubscriptions.personId, ids)));
  }
  return rows;
}

async function analyzeDatabase(parsed: ParsedMailchimpExport) {
  const existingPeople = await loadExistingPeople(parsed);
  const subscriptions = await loadExistingSubscriptions(existingPeople.map((person) => person.id));
  const peopleByEmail = new Map(existingPeople.map((person) => [person.email, person]));
  const subscriptionByKey = new Map(subscriptions.map((subscription) => [`${subscription.personId}\0${subscription.topic}`, subscription]));
  let preservedNativeSubscriptions = 0;
  let newSubscriptions = 0;
  let refreshedMailchimpSubscriptions = 0;
  const preservedComparisons = new Map<string, number>();
  for (const plan of parsed.topicPlans) {
    const person = peopleByEmail.get(plan.email);
    const current = person ? subscriptionByKey.get(`${person.id}\0${plan.topic}`) : undefined;
    if (!current) newSubscriptions += 1;
    else if (current.source === "mailchimp_export") refreshedMailchimpSubscriptions += 1;
    else {
      preservedNativeSubscriptions += 1;
      const comparison = `${current.topic}:${current.status}->${plan.status}`;
      preservedComparisons.set(comparison, (preservedComparisons.get(comparison) ?? 0) + 1);
    }
  }
  return {
    existingPeople: existingPeople.length,
    newPeople: parsed.people.length - existingPeople.length,
    newSubscriptions,
    refreshedMailchimpSubscriptions,
    preservedNativeSubscriptions,
    preservedComparisons: Object.fromEntries([...preservedComparisons.entries()].sort(([left], [right]) => left.localeCompare(right))),
  };
}

async function applyImport(parsed: ParsedMailchimpExport) {
  const now = new Date();
  const db = getDb();
  return db.transaction(async (tx) => {
    const [run] = await tx
      .insert(mailchimpImportRuns)
      .values({
        fingerprint: parsed.fingerprint,
        sourceLabel: "Mailchimp CRM export",
        status: "running",
        totalRows: parsed.summary.totalRows,
        uniqueContacts: parsed.summary.uniquePeople,
        audienceCount: Object.keys(parsed.summary.audienceContacts).length,
        segmentCount: new Set(parsed.rows.map((row) => row.segmentKey)).size,
        fileManifestJson: parsed.manifest,
        summaryJson: parsed.summary,
        startedAt: now,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: mailchimpImportRuns.fingerprint,
        set: {
          status: "running",
          totalRows: parsed.summary.totalRows,
          uniqueContacts: parsed.summary.uniquePeople,
          audienceCount: Object.keys(parsed.summary.audienceContacts).length,
          segmentCount: new Set(parsed.rows.map((row) => row.segmentKey)).size,
          fileManifestJson: parsed.manifest,
          summaryJson: parsed.summary,
          startedAt: now,
          completedAt: null,
          updatedAt: now,
        },
      })
      .returning({ id: mailchimpImportRuns.id });
    if (!run) throw new Error("Unable to create Mailchimp import run");

    const existingRows: ExistingPerson[] = [];
    for (const emails of chunks(parsed.people.map((plan) => plan.email), 500)) {
      existingRows.push(...await tx
        .select({
          id: people.id,
          userId: people.userId,
          status: people.status,
          firstName: people.firstName,
          lastName: people.lastName,
          displayName: people.displayName,
          email: people.email,
          phone: people.phone,
          city: people.city,
          source: people.source,
          tags: people.tags,
          emailOptIn: communicationPreferences.emailOptIn,
          doNotContact: communicationPreferences.doNotContact,
        })
        .from(people)
        .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
        .where(inArray(people.email, emails)));
    }
    const existingByEmail = new Map(existingRows.map((person) => [person.email, person]));
    const newPlans = parsed.people.filter((plan) => !existingByEmail.has(plan.email));
    for (const batch of chunks(newPlans, 300)) {
      await tx.insert(people).values(batch.map((plan) => importedPersonValues(plan, now))).onConflictDoNothing({ target: people.email });
    }
    const refreshPlans = parsed.people.filter((plan) => {
      const existing = existingByEmail.get(plan.email);
      return existing?.source === "mailchimp_import" && existing.userId === null;
    });
    for (const batch of chunks(refreshPlans, 300)) {
      await tx.insert(people).values(batch.map((plan) => importedPersonValues(plan, now))).onConflictDoUpdate({
        target: people.email,
        set: {
          status: sql`excluded.status`,
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          displayName: sql`excluded.display_name`,
          phone: sql`excluded.phone`,
          city: sql`excluded.city`,
          tags: sql`excluded.tags`,
          updatedAt: now,
        },
      });
    }
    const refreshedEmails = new Set(refreshPlans.map((plan) => plan.email));
    for (const plan of parsed.people.filter((candidate) => !refreshedEmails.has(candidate.email))) {
      const existing = existingByEmail.get(plan.email);
      if (!existing) continue;
      await tx.update(people).set({ ...personPatch(existing, plan), updatedAt: now }).where(eq(people.id, existing.id));
    }

    const personRows: Array<{ id: number; email: string; source: string }> = [];
    for (const emails of chunks(parsed.people.map((plan) => plan.email), 500)) {
      personRows.push(...await tx.select({ id: people.id, email: people.email, source: people.source }).from(people).where(inArray(people.email, emails)));
    }
    const personByEmail = new Map(personRows.map((person) => [person.email, person]));
    if (personByEmail.size !== parsed.people.length) throw new Error("Not every Mailchimp contact has a CRM person row");

    for (const batch of chunks(parsed.people, 300)) {
      await tx.insert(contactMethods).values(batch.map((plan) => ({
        personId: personByEmail.get(plan.email)!.id,
        type: "email" as const,
        value: plan.email,
        isPrimary: true,
        createdAt: now,
        updatedAt: now,
      }))).onConflictDoNothing();
    }
    const phones = parsed.people.filter((plan) => plan.profile.phone);
    if (phones.length > 0) {
      await tx.insert(contactMethods).values(phones.map((plan) => ({
        personId: personByEmail.get(plan.email)!.id,
        type: "phone" as const,
        value: plan.profile.phone,
        isPrimary: true,
        createdAt: now,
        updatedAt: now,
      }))).onConflictDoNothing();
    }

    const contactIdRows: Array<{ id: number; personId: number; audienceKey: string }> = [];
    for (const batch of chunks(parsed.contacts, 150)) {
      contactIdRows.push(...await tx
        .insert(mailchimpContacts)
        .values(batch.map((contact) => contactValues(contact, personByEmail.get(contact.email)!.id, run.id, now)))
        .onConflictDoUpdate({
          target: [mailchimpContacts.personId, mailchimpContacts.audienceKey],
          set: {
            lastImportRunId: run.id,
            audienceLabel: sql`excluded.audience_label`,
            exportStatus: sql`excluded.export_status`,
            email: sql`excluded.email`,
            euid: sql`excluded.euid`,
            leid: sql`excluded.leid`,
            firstName: sql`excluded.first_name`,
            lastName: sql`excluded.last_name`,
            addressRaw: sql`excluded.address_raw`,
            addressLine1: sql`excluded.address_line_1`,
            addressLine2: sql`excluded.address_line_2`,
            city: sql`excluded.city`,
            state: sql`excluded.state`,
            postalCode: sql`excluded.postal_code`,
            country: sql`excluded.country`,
            phoneRaw: sql`excluded.phone_raw`,
            birthdate: sql`excluded.birthdate`,
            emailType: sql`excluded.email_type`,
            memberRating: sql`excluded.member_rating`,
            optinTime: sql`excluded.optin_time`,
            optinIp: sql`excluded.optin_ip`,
            confirmTime: sql`excluded.confirm_time`,
            confirmIp: sql`excluded.confirm_ip`,
            gmtOffset: sql`excluded.gmt_offset`,
            dstOffset: sql`excluded.dst_offset`,
            timezone: sql`excluded.timezone`,
            countryCode: sql`excluded.country_code`,
            region: sql`excluded.region`,
            lastChangedAt: sql`excluded.last_changed_at`,
            unsubscribedAt: sql`excluded.unsubscribed_at`,
            unsubscribeCampaignTitle: sql`excluded.unsubscribe_campaign_title`,
            unsubscribeCampaignId: sql`excluded.unsubscribe_campaign_id`,
            unsubscribeReason: sql`excluded.unsubscribe_reason`,
            unsubscribeReasonOther: sql`excluded.unsubscribe_reason_other`,
            cleanedAt: sql`excluded.cleaned_at`,
            cleanCampaignTitle: sql`excluded.clean_campaign_title`,
            cleanCampaignId: sql`excluded.clean_campaign_id`,
            interests: sql`excluded.interests`,
            relationships: sql`excluded.relationships`,
            tags: sql`excluded.tags`,
            notes: sql`excluded.notes`,
            sourceFiles: sql`excluded.source_files`,
            rawJson: sql`excluded.raw_json`,
            importedAt: now,
            updatedAt: now,
          },
        })
        .returning({ id: mailchimpContacts.id, personId: mailchimpContacts.personId, audienceKey: mailchimpContacts.audienceKey }));
    }
    const contactIdByKey = new Map(contactIdRows.map((contact) => [`${contact.personId}\0${contact.audienceKey}`, contact.id]));

    for (const batch of chunks(parsed.rows, 300)) {
      await tx
        .insert(mailchimpSegmentMemberships)
        .values(batch.map((row) => {
          const personId = personByEmail.get(row.email)!.id;
          return {
            personId,
            mailchimpContactId: contactIdByKey.get(`${personId}\0${row.audienceKey}`)!,
            lastImportRunId: run.id,
            audienceKey: row.audienceKey,
            segmentKey: row.segmentKey,
            segmentLabel: row.segmentLabel,
            exportStatus: row.exportStatus,
            sourceFileName: row.sourceFileName,
            rawJson: row.raw,
            importedAt: now,
            createdAt: now,
            updatedAt: now,
          };
        }))
        .onConflictDoUpdate({
          target: [mailchimpSegmentMemberships.personId, mailchimpSegmentMemberships.audienceKey, mailchimpSegmentMemberships.segmentKey],
          set: {
            mailchimpContactId: sql`excluded.mailchimp_contact_id`,
            lastImportRunId: run.id,
            segmentLabel: sql`excluded.segment_label`,
            exportStatus: sql`excluded.export_status`,
            sourceFileName: sql`excluded.source_file_name`,
            rawJson: sql`excluded.raw_json`,
            importedAt: now,
            updatedAt: now,
          },
        });
    }

    const allPersonIds = personRows.map((person) => person.id);
    const existingSubscriptions: ExistingSubscription[] = [];
    for (const ids of chunks(allPersonIds, 500)) {
      existingSubscriptions.push(...await tx
        .select({
          id: newsletterSubscriptions.id,
          personId: newsletterSubscriptions.personId,
          topic: newsletterSubscriptions.topic,
          status: newsletterSubscriptions.status,
          source: newsletterSubscriptions.source,
          updatedAt: newsletterSubscriptions.updatedAt,
        })
        .from(newsletterSubscriptions)
        .where(inArray(newsletterSubscriptions.personId, ids)));
    }
    const subscriptionByKey = new Map(existingSubscriptions.map((subscription) => [`${subscription.personId}\0${subscription.topic}`, subscription]));
    const topicUpserts: Array<typeof newsletterSubscriptions.$inferInsert> = [];
    for (const plan of parsed.topicPlans) {
      const personId = personByEmail.get(plan.email)!.id;
      const existing = subscriptionByKey.get(`${personId}\0${plan.topic}`);
      if (existing && existing.source !== "mailchimp_export") continue;
      topicUpserts.push({
        personId,
        topic: plan.topic,
        status: plan.status,
        source: "mailchimp_export",
        unsubscribeToken: plan.unsubscribeToken,
        confirmedAt: plan.confirmedAt,
        unsubscribedAt: plan.unsubscribedAt,
        lastProviderEventAt: plan.lastProviderEventAt,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const batch of chunks(topicUpserts, 300)) {
      await tx.insert(newsletterSubscriptions).values(batch).onConflictDoUpdate({
        target: [newsletterSubscriptions.personId, newsletterSubscriptions.topic],
        set: {
          status: sql`excluded.status`,
          source: "mailchimp_export",
          confirmedAt: sql`excluded.confirmed_at`,
          unsubscribedAt: sql`excluded.unsubscribed_at`,
          lastProviderEventAt: sql`excluded.last_provider_event_at`,
          updatedAt: now,
        },
      });
    }

    const providerSubscribedEmails = new Set(parsed.contacts.filter((contact) => contact.exportStatus === "subscribed").map((contact) => contact.email));
    const currentSubscriptions: ExistingSubscription[] = [];
    for (const ids of chunks(allPersonIds, 500)) {
      currentSubscriptions.push(...await tx
        .select({
          id: newsletterSubscriptions.id,
          personId: newsletterSubscriptions.personId,
          topic: newsletterSubscriptions.topic,
          status: newsletterSubscriptions.status,
          source: newsletterSubscriptions.source,
          updatedAt: newsletterSubscriptions.updatedAt,
        })
        .from(newsletterSubscriptions)
        .where(inArray(newsletterSubscriptions.personId, ids)));
    }
    const hasSubscribedTopic = new Set(currentSubscriptions.filter((subscription) => subscription.status === "subscribed").map((subscription) => subscription.personId));
    for (const batch of chunks(parsed.people, 300)) {
      await tx.insert(communicationPreferences).values(batch.map((plan) => {
        const person = personByEmail.get(plan.email)!;
        return {
          personId: person.id,
          emailOptIn: providerSubscribedEmails.has(plan.email) || hasSubscribedTopic.has(person.id),
          preferredChannel: "email" as const,
          createdAt: now,
          updatedAt: now,
        };
      })).onConflictDoNothing();
    }
    const preferenceUpdates = existingRows.filter((existing) => existing.emailOptIn !== false && existing.doNotContact !== true);
    for (const batch of chunks(preferenceUpdates, 300)) {
      await tx.insert(communicationPreferences).values(batch.map((existing) => ({
        personId: existing.id,
        emailOptIn: providerSubscribedEmails.has(existing.email) || hasSubscribedTopic.has(existing.id),
        preferredChannel: "email" as const,
        createdAt: now,
        updatedAt: now,
      }))).onConflictDoUpdate({
        target: communicationPreferences.personId,
        set: { emailOptIn: sql`excluded.email_opt_in`, updatedAt: now },
      });
    }

    const cleanedByEmail = new Map<string, Date | null>();
    for (const contact of parsed.contacts.filter((candidate) => candidate.exportStatus === "cleaned")) {
      const current = cleanedByEmail.get(contact.email);
      const eventAt = contact.cleanedAt ?? contact.lastChangedAt;
      if (!current || (eventAt && eventAt > current)) cleanedByEmail.set(contact.email, eventAt);
    }
    const nativeSubscribedByPerson = Map.groupBy(
      currentSubscriptions.filter((subscription) => subscription.status === "subscribed" && subscription.source !== "mailchimp_export"),
      (subscription) => subscription.personId,
    );
    const requiredSuppressions = [...cleanedByEmail.entries()].filter(([email, cleanedAt]) => {
      const personId = personByEmail.get(email)!.id;
      return !(nativeSubscribedByPerson.get(personId) ?? []).some((subscription) => !cleanedAt || subscription.updatedAt > cleanedAt);
    });
    if (requiredSuppressions.length > 0) {
      await tx.insert(messageSuppressions).values(requiredSuppressions.map(([email]) => ({
        personId: personByEmail.get(email)!.id,
        channel: "email" as const,
        email,
        reason: "mailchimp_cleaned",
        createdAt: now,
        updatedAt: now,
      }))).onConflictDoNothing();
    }
    const requiredSuppressionEmails = requiredSuppressions.map(([email]) => email);
    for (const emailBatch of chunks(parsed.people.map((plan) => plan.email), 500)) {
      await tx.delete(messageSuppressions).where(and(
        eq(messageSuppressions.reason, "mailchimp_cleaned"),
        inArray(messageSuppressions.email, emailBatch),
        requiredSuppressionEmails.length > 0 ? notInArray(messageSuppressions.email, requiredSuppressionEmails) : undefined,
      ));
    }

    const summary = {
      ...parsed.summary,
      crmPeople: personByEmail.size,
      crmProfiles: parsed.contacts.length,
      nativeTopicSubscriptions: parsed.topicPlans.length,
      cleanedSuppressions: requiredSuppressions.length,
    };
    await tx.update(mailchimpImportRuns).set({ status: "completed", summaryJson: summary, completedAt: now, updatedAt: now }).where(eq(mailchimpImportRuns.id, run.id));
    return { runId: run.id, summary };
  });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const options = args();
  const parsed = await parseMailchimpExportRoot(options.exportRoot);
  const database = await analyzeDatabase(parsed);
  console.log(JSON.stringify({ mode: options.apply ? "apply" : "dry-run", fingerprint: parsed.fingerprint, export: parsed.summary, database }, null, 2));
  if (!options.apply) {
    console.log("Dry run only. Re-run with --apply after reviewing the reconciliation above.");
    return;
  }
  const result = await applyImport(parsed);
  console.log(JSON.stringify({ applied: true, ...result }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  });
