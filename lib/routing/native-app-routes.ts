import { normalizePath } from "@/lib/mirror/url";

export const NATIVE_APP_ROUTE_PATHS = [
  "/about-us",
  "/center-city",
  "/center-city-beit-midrash",
  "/cherry-hill",
  "/contact-us",
  "/copy-of-center-city-beit-midrash",
  "/davening",
  "/donations",
  "/events",
  "/from-the-rabbi-s-desk",
  "/general-5",
  "/in-the-news",
  "/israel",
  "/kosher-map",
  "/main-line-manyunk",
  "/mekor-bulletin-board",
  "/old-kosher-restaurants",
  "/old-yorkroad-northeast",
  "/our-communities",
  "/our-rabbi",
  "/philly-jewish-community",
  "/search",
  "/team-4",
  "/testimonials",
  "/visit-us",
] as const;

export const NATIVE_TEMPLATE_PREFIXES = [
  "/post/",
  "/news/",
  "/events-1/",
  "/profile/",
  "/kosher-posts/categories/",
  "/kosher-posts/tags/",
] as const;

const NATIVE_APP_ROUTE_SET = new Set<string>(NATIVE_APP_ROUTE_PATHS);

function toPathname(pathValue: string) {
  return normalizePath(pathValue).split("?")[0] ?? "/";
}

export function isNativeAppOwnedPath(pathValue: string) {
  const pathname = toPathname(pathValue);

  if (NATIVE_APP_ROUTE_SET.has(pathname)) {
    return true;
  }

  return NATIVE_TEMPLATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
