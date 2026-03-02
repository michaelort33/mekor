import { normalizePath } from "@/lib/mirror/url";

export type RouteRenderMode = "mirror" | "native";

export const FORCE_MIRROR_ALL_ENV = "FORCE_MIRROR_ALL";

const ROUTE_RENDER_MODE_REGISTRY: Record<string, RouteRenderMode> = {
  "/center-city": "native",
  "/cherry-hill": "native",
  "/events": "native",
  "/in-the-news": "native",
  "/main-line-manyunk": "native",
  "/old-yorkroad-northeast": "native",
};

function toPathname(pathValue: string) {
  return normalizePath(pathValue).split("?")[0] ?? "/";
}

export function isForceMirrorAllEnabled(rawValue: string | undefined = process.env[FORCE_MIRROR_ALL_ENV]) {
  return rawValue === "true";
}

export function getConfiguredRenderMode(pathValue: string): RouteRenderMode {
  const pathname = toPathname(pathValue);
  return ROUTE_RENDER_MODE_REGISTRY[pathname] ?? "mirror";
}

export function getEffectiveRenderMode(
  pathValue: string,
  forceMirrorAllValue: string | undefined = process.env[FORCE_MIRROR_ALL_ENV],
): RouteRenderMode {
  if (isForceMirrorAllEnabled(forceMirrorAllValue)) {
    return "mirror";
  }

  return getConfiguredRenderMode(pathValue);
}

export function listConfiguredRenderModes() {
  return Object.entries(ROUTE_RENDER_MODE_REGISTRY).map(([path, mode]) => ({
    path,
    mode,
  }));
}
