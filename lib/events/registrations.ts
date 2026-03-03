export type EventRegistrationStatus = "registered" | "waitlisted" | "cancelled" | "payment_pending";

export type EventRegistrationLite = {
  id: number;
  status: EventRegistrationStatus;
  registeredAt: Date;
};

export function countActiveEventSpots(registrations: EventRegistrationLite[]) {
  return registrations.filter((registration) => registration.status === "registered").length;
}

export function pickNextWaitlistedRegistration(registrations: EventRegistrationLite[]) {
  const waitlisted = registrations
    .filter((registration) => registration.status === "waitlisted")
    .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());

  return waitlisted[0] ?? null;
}

export function isEventReminderDue(input: { startAt: Date; now: Date }) {
  const msUntilStart = input.startAt.getTime() - input.now.getTime();
  return msUntilStart > 0 && msUntilStart <= 24 * 60 * 60 * 1000;
}
