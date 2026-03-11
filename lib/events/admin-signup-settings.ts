import { normalizeEventSignupSettings } from "@/lib/events/signup-settings";
import { isEventPast } from "@/lib/events/status";

export type AdminEventSignupSettingsTier = {
  id: number;
  eventSignupSettingsId: number;
  name: string;
  priceCents: number;
  currency: string;
  active: boolean;
  sortOrder: number;
};

export type AdminEventSignupSettingsRow = {
  id: number | null;
  eventId: number;
  eventTitle: string;
  eventPath: string;
  startAt: Date | null;
  endAt: Date | null;
  enabled: boolean | null;
  capacity: number | null;
  waitlistEnabled: boolean | null;
  paymentRequired: boolean | null;
  registrationDeadline: Date | null;
  organizerEmail: string | null;
  updatedAt: Date | null;
};

export function toAdminEventSignupSettings(
  row: AdminEventSignupSettingsRow,
  tiersBySetting: Map<number, AdminEventSignupSettingsTier[]>,
) {
  const normalized = normalizeEventSignupSettings(row);
  const startAt = row.startAt ? row.startAt.toISOString() : null;
  const endAt = row.endAt ? row.endAt.toISOString() : null;

  return {
    id: normalized.id,
    eventId: row.eventId,
    eventTitle: row.eventTitle,
    eventPath: row.eventPath,
    startAt,
    endAt,
    isPast: isEventPast({ startAt, endAt }),
    enabled: normalized.enabled,
    capacity: normalized.capacity,
    waitlistEnabled: normalized.waitlistEnabled,
    paymentRequired: normalized.paymentRequired,
    registrationDeadline: normalized.registrationDeadline,
    organizerEmail: normalized.organizerEmail,
    updatedAt: row.updatedAt ?? null,
    tiers: row.id ? tiersBySetting.get(row.id) ?? [] : [],
  };
}
