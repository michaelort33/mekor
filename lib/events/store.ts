import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { eventSignupSettings, events } from "@/db/schema";
import { canAcceptEventSignup, isEventClosed, isEventPast } from "@/lib/events/status";
import { normalizeEventSignupSettings } from "@/lib/events/signup-settings";
import { validateManagedEventsContract } from "@/lib/native/contracts";

export type ManagedEvent = {
  slug: string;
  path: string;
  title: string;
  heroImage: string;
  shortDate: string;
  location: string;
  timeLabel: string;
  startAt: string | null;
  endAt: string | null;
  isClosed: boolean;
  isPast: boolean;
  signupEnabled: boolean;
  registrationDeadline: string | null;
};

function readSourceHeroImage(sourceJson: Record<string, unknown> | null | undefined) {
  const value = sourceJson?.heroImage;
  return typeof value === "string" ? value : "";
}

function toManagedEvent(row: {
  slug: string;
  path: string;
  title: string;
  sourceJson?: Record<string, unknown>;
  shortDate: string;
  location: string;
  timeLabel: string;
  startAt: Date | null;
  endAt: Date | null;
  isClosed: boolean;
  registrationDeadline?: Date | null;
  signupEnabled?: boolean | null;
}): ManagedEvent {
  const startAt = row.startAt ? row.startAt.toISOString() : null;
  const endAt = row.endAt ? row.endAt.toISOString() : null;
  const registrationDeadline = row.registrationDeadline ? row.registrationDeadline.toISOString() : null;
  const isPast = isEventPast({ startAt, endAt });

  return {
    slug: row.slug,
    path: row.path,
    title: row.title,
    heroImage: readSourceHeroImage(row.sourceJson),
    shortDate: row.shortDate,
    location: row.location,
    timeLabel: row.timeLabel,
    startAt,
    endAt,
    isClosed: isEventClosed({ startAt, endAt, isClosed: row.isClosed }),
    isPast,
    signupEnabled: canAcceptEventSignup({
      startAt,
      endAt,
      isClosed: row.isClosed,
      signupEnabled: row.signupEnabled ?? true,
      registrationDeadline,
    }),
    registrationDeadline,
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
      sourceJson: events.sourceJson,
      shortDate: events.shortDate,
      location: events.location,
      timeLabel: events.timeLabel,
      startAt: events.startAt,
      endAt: events.endAt,
      isClosed: events.isClosed,
      signupSettingEnabled: eventSignupSettings.enabled,
      registrationDeadline: eventSignupSettings.registrationDeadline,
    })
    .from(events)
    .leftJoin(eventSignupSettings, eq(eventSignupSettings.eventId, events.id))
    .orderBy(asc(events.startAt), desc(events.updatedAt));

  const managed = rows
    .map((row) =>
      toManagedEvent({
        ...row,
        registrationDeadline: row.registrationDeadline,
        signupEnabled: normalizeEventSignupSettings({ enabled: row.signupSettingEnabled }).enabled,
      }),
    )
    .sort((left, right) => {
      if (left.isPast !== right.isPast) {
        return left.isPast ? 1 : -1;
      }

      const leftTime = left.startAt ? new Date(left.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.startAt ? new Date(right.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    });

  return validateManagedEventsContract(managed, "getManagedEvents: db output");
}
