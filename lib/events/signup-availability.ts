export function canShowEventSignupAction(input: { isClosed: boolean; signupEnabled: boolean }) {
  return !input.isClosed && input.signupEnabled;
}
