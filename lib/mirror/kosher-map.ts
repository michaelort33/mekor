import { normalizePath } from "@/lib/mirror/url";

export const KOSHER_NEIGHBORHOOD_PATHS = new Set([
  "/center-city",
  "/main-line-manyunk",
  "/old-yorkroad-northeast",
  "/cherry-hill",
]);

export const KOSHER_MAP_PATH = "/kosher-map";

export function shouldLoadKosherMapScript(path: string) {
  const normalized = normalizePath(path);
  return normalized === KOSHER_MAP_PATH || KOSHER_NEIGHBORHOOD_PATHS.has(normalized);
}
