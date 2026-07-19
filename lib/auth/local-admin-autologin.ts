const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLocalAdminAutologinEnabled(input: {
  hostname: string;
  nodeEnv: string | undefined;
  adminEmail: string | undefined;
}) {
  return (
    input.nodeEnv !== "production" &&
    LOOPBACK_HOSTS.has(input.hostname.toLowerCase()) &&
    Boolean(input.adminEmail?.trim())
  );
}

export function resolveLocalAdminNextPath(value: string | null) {
  if (!value || value.startsWith("//")) return "/admin";
  if (value === "/admin" || value.startsWith("/admin/")) return value;
  return "/admin";
}
