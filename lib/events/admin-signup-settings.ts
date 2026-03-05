import { normalizeEventSignupSettings } from "@/lib/events/signup-settings";

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

  return {
    id: normalized.id,
    eventId: row.eventId,
    eventTitle: row.eventTitle,
    eventPath: row.eventPath,
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
