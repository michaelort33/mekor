import { canAcceptEventSignup } from "@/lib/events/status";

export function canShowEventSignupAction(input: {
  startAt?: string | null;
  endAt?: string | null;
  isClosed: boolean;
  signupEnabled: boolean;
  specialSchedule?: boolean;
  registrationDeadline?: string | null;
}) {
  if (input.specialSchedule) {
    return false;
  }

  return canAcceptEventSignup(input);
}
