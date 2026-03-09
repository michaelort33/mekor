import { canAcceptEventSignup } from "@/lib/events/status";

export function canShowEventSignupAction(input: {
  startAt?: string | null;
  endAt?: string | null;
  isClosed: boolean;
  signupEnabled: boolean;
  registrationDeadline?: string | null;
}) {
  return canAcceptEventSignup(input);
}
