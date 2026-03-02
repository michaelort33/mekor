export const NATIVE_ROUTE_PATHS = [
  "/center-city",
  "/cherry-hill",
  "/events",
  "/in-the-news",
  "/main-line-manyunk",
  "/old-yorkroad-northeast",
] as const;

export const NATIVE_ROUTE_SET = new Set<string>(NATIVE_ROUTE_PATHS);
