export const DEFAULT_EVENT_SIGNUP_SETTINGS = {
  enabled: true,
  capacity: null as number | null,
  waitlistEnabled: false,
  paymentRequired: false,
  registrationDeadline: null as Date | null,
  organizerEmail: "",
} as const;

type EventSignupSettingsLike = {
  id?: number | null;
  enabled?: boolean | null;
  capacity?: number | null;
  waitlistEnabled?: boolean | null;
  paymentRequired?: boolean | null;
  registrationDeadline?: Date | null;
  organizerEmail?: string | null;
};

export function normalizeEventSignupSettings(input: EventSignupSettingsLike | null | undefined) {
  return {
    id: input?.id ?? null,
    enabled: input?.enabled ?? DEFAULT_EVENT_SIGNUP_SETTINGS.enabled,
    capacity: input?.capacity ?? DEFAULT_EVENT_SIGNUP_SETTINGS.capacity,
    waitlistEnabled: input?.waitlistEnabled ?? DEFAULT_EVENT_SIGNUP_SETTINGS.waitlistEnabled,
    paymentRequired: input?.paymentRequired ?? DEFAULT_EVENT_SIGNUP_SETTINGS.paymentRequired,
    registrationDeadline: input?.registrationDeadline ?? DEFAULT_EVENT_SIGNUP_SETTINGS.registrationDeadline,
    organizerEmail: input?.organizerEmail ?? DEFAULT_EVENT_SIGNUP_SETTINGS.organizerEmail,
  };
}
