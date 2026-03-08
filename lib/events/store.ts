import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { eventSignupSettings, events } from "@/db/schema";
import { normalizeEventSignupSettings } from "@/lib/events/signup-settings";
import { validateManagedEventsContract } from "@/lib/native/contracts";

export type ManagedEvent = {
  slug: string;
  path: string;
  title: string;
  shortDate: string;
  location: string;
  timeLabel: string;
  startAt: string | null;
  endAt: string | null;
  isClosed: boolean;
  signupEnabled: boolean;
};

function toManagedEvent(row: {
  slug: string;
  path: string;
  title: string;
  shortDate: string;
  location: string;
  timeLabel: string;
  startAt: Date | null;
  endAt: Date | null;
  isClosed: boolean;
  signupEnabled?: boolean | null;
}): ManagedEvent {
  return {
    slug: row.slug,
    path: row.path,
    title: row.title,
    shortDate: row.shortDate,
    location: row.location,
    timeLabel: row.timeLabel,
    startAt: row.startAt ? row.startAt.toISOString() : null,
    endAt: row.endAt ? row.endAt.toISOString() : null,
    isClosed: row.isClosed,
    signupEnabled: row.signupEnabled ?? true,
  };
}

export async function ensureManagedEventRecordByPath(path: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const [existing] = await getDb().select({ id: events.id }).from(events).where(eq(events.path, path)).limit(1);
  return existing?.id ?? null;
}

export async function getManagedEvents() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for managed events");
  }

  const rows = await getDb()
    .select({
      slug: events.slug,
      path: events.path,
      title: events.title,
      shortDate: events.shortDate,
      location: events.location,
      timeLabel: events.timeLabel,
      startAt: events.startAt,
      endAt: events.endAt,
      isClosed: events.isClosed,
      signupSettingEnabled: eventSignupSettings.enabled,
    })
    .from(events)
    .leftJoin(eventSignupSettings, eq(eventSignupSettings.eventId, events.id))
    .orderBy(asc(events.startAt), desc(events.updatedAt));

  const managed = rows.map((row) =>
    toManagedEvent({
      ...row,
      signupEnabled: normalizeEventSignupSettings({ enabled: row.signupSettingEnabled }).enabled,
    }),
  );

  return validateManagedEventsContract(managed, "getManagedEvents: db output");
}
