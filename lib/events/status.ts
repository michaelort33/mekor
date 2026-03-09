type EventStatusInput = {
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  isClosed?: boolean | null;
  signupEnabled?: boolean | null;
  registrationDeadline?: string | Date | null;
};

function toDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isEventPast(input: Pick<EventStatusInput, "startAt" | "endAt">, now = new Date()) {
  const cutoff = toDate(input.endAt) ?? toDate(input.startAt);
  if (!cutoff) {
    return false;
  }

  return cutoff.getTime() <= now.getTime();
}

export function isEventClosed(input: Pick<EventStatusInput, "startAt" | "endAt" | "isClosed">, now = new Date()) {
  return Boolean(input.isClosed) || isEventPast(input, now);
}

export function canAcceptEventSignup(
  input: Pick<EventStatusInput, "startAt" | "endAt" | "isClosed" | "signupEnabled" | "registrationDeadline">,
  now = new Date(),
) {
  if (!input.signupEnabled) {
    return false;
  }

  if (isEventClosed(input, now)) {
    return false;
  }

  const deadline = toDate(input.registrationDeadline);
  if (!deadline) {
    return true;
  }

  return deadline.getTime() > now.getTime();
}
