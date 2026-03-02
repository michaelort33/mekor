import { normalizePath } from "@/lib/mirror/url";

export const NATIVE_ROUTE_FLAG_BY_PATH = {
  "/center-city": "NEXT_PUBLIC_NATIVE_ROUTE_CENTER_CITY",
  "/cherry-hill": "NEXT_PUBLIC_NATIVE_ROUTE_CHERRY_HILL",
  "/events": "NEXT_PUBLIC_NATIVE_ROUTE_EVENTS",
  "/in-the-news": "NEXT_PUBLIC_NATIVE_ROUTE_IN_THE_NEWS",
  "/main-line-manyunk": "NEXT_PUBLIC_NATIVE_ROUTE_MAIN_LINE_MANYUNK",
  "/old-yorkroad-northeast": "NEXT_PUBLIC_NATIVE_ROUTE_OLD_YORKROAD_NORTHEAST",
} as const;

export const NATIVE_APP_PATHS = new Set(Object.keys(NATIVE_ROUTE_FLAG_BY_PATH));

function isFlagEnabled(raw: string | undefined, defaultValue: boolean) {
  if (raw == null) {
    return defaultValue;
  }

  const value = raw.trim().toLowerCase();
  if (value === "0" || value === "false" || value === "off") {
    return false;
  }

  if (value === "1" || value === "true" || value === "on") {
    return true;
  }

  return defaultValue;
}

export function isNativeRouteEnabled(pathValue: string) {
  const normalized = normalizePath(pathValue);
  const flagName = NATIVE_ROUTE_FLAG_BY_PATH[normalized as keyof typeof NATIVE_ROUTE_FLAG_BY_PATH];

  if (!flagName) {
    return false;
  }

  const defaultEnabled = process.env.NEXT_PUBLIC_NATIVE_ROUTES_DEFAULT !== "false";
  return isFlagEnabled(process.env[flagName], defaultEnabled);
}
