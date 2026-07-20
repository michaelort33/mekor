const HIDDEN_EXACT_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

const HIDDEN_PREFIXES = ["/admin", "/invite"];

export function shouldHideFeedbackWidget(pathname: string | null | undefined) {
  if (!pathname) return true;
  if (HIDDEN_EXACT_PATHS.has(pathname)) return true;
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
