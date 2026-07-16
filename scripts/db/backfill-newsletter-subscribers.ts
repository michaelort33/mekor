import { config as loadEnv } from "dotenv";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { communicationPreferences, mailchimpSignupEvents, people } from "@/db/schema";
import { syncNewsletterSubscriptionEvent } from "@/lib/newsletter/subscriptions";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const optedInPeople = await getDb()
    .select({ email: people.email, displayName: people.displayName, updatedAt: communicationPreferences.updatedAt })
    .from(people)
    .innerJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
    .where(and(eq(communicationPreferences.emailOptIn, true), eq(communicationPreferences.doNotContact, false)));
  const signupEvents = await getDb()
    .select({ email: mailchimpSignupEvents.email, firstName: mailchimpSignupEvents.firstName, lastName: mailchimpSignupEvents.lastName, occurredAt: mailchimpSignupEvents.occurredAt })
    .from(mailchimpSignupEvents)
    .where(eq(mailchimpSignupEvents.eventType, "subscribe"));

  const byEmail = new Map<string, { email: string; displayName: string; occurredAt: Date; source: string }>();
  for (const person of optedInPeople) {
    if (!person.email) continue;
    byEmail.set(person.email.toLowerCase(), { email: person.email, displayName: person.displayName, occurredAt: person.updatedAt, source: "existing_people_preferences" });
  }
  for (const event of signupEvents) {
    if (!event.email) continue;
    byEmail.set(event.email.toLowerCase(), { email: event.email, displayName: [event.firstName, event.lastName].filter(Boolean).join(" "), occurredAt: event.occurredAt, source: "existing_newsletter_signup" });
  }
  for (const subscriber of byEmail.values()) {
    await syncNewsletterSubscriptionEvent({ ...subscriber, status: "subscribed" });
  }
  console.log(`Backfilled ${byEmail.size} confirmed newsletter subscribers`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
