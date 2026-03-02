import { normalizePath } from "@/lib/mirror/url";

export const TEAM0_NATIVE_ROUTE_PATHS = [
  "/team-4",
  "/from-the-rabbi-s-desk",
  "/kosher-map",
] as const;

export type Team0NativeRoutePath = (typeof TEAM0_NATIVE_ROUTE_PATHS)[number];

export const TEAM0_NATIVE_ROUTE_FLAG_KEYS: Record<Team0NativeRoutePath, readonly string[]> = {
  "/team-4": ["TEAM0_NATIVE_TEAM_4", "NEXT_PUBLIC_TEAM0_NATIVE_TEAM_4"],
  "/from-the-rabbi-s-desk": [
    "TEAM0_NATIVE_FROM_THE_RABBI_S_DESK",
    "NEXT_PUBLIC_TEAM0_NATIVE_FROM_THE_RABBI_S_DESK",
  ],
  "/kosher-map": ["TEAM0_NATIVE_KOSHER_MAP", "NEXT_PUBLIC_TEAM0_NATIVE_KOSHER_MAP"],
};

function toBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(normalized);
}

export function isTeam0NativeRouteEnabled(pathValue: Team0NativeRoutePath) {
  const normalizedPath = normalizePath(pathValue) as Team0NativeRoutePath;
  const keys = TEAM0_NATIVE_ROUTE_FLAG_KEYS[normalizedPath];

  for (const key of keys) {
    const raw = process.env[key];
    if (raw === undefined) {
      continue;
    }

    return toBoolean(raw);
  }

  return true;
}
