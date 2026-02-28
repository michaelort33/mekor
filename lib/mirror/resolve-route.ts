import { cache } from "react";

import {
  getDocumentByPath,
  loadRouteSets,
  resolveRequestPath,
} from "@/lib/mirror/loaders";
import type { PageDocument } from "@/lib/mirror/types";
import { normalizePath } from "@/lib/mirror/url";

export type MirrorRouteResolution = {
  requestPath: string;
  resolvedPath: string;
  overrideStatus: number | undefined;
  isKnownRoute: boolean;
  document: PageDocument | null;
};

export const loadMirrorDocumentForPath = cache(async (pathValue: string) => {
  const normalized = normalizePath(pathValue);
  const resolved = await resolveRequestPath(normalized);

  const document =
    (await getDocumentByPath(normalized)) ??
    (await getDocumentByPath(resolved.resolved));

  return {
    requestPath: normalized,
    resolvedPath: resolved.resolved,
    document,
  };
});

export const resolveMirrorRoute = cache(async (pathValue: string): Promise<MirrorRouteResolution> => {
  const { requestPath, resolvedPath, document } = await loadMirrorDocumentForPath(pathValue);
  const routeSets = await loadRouteSets();

  const overrideStatus = routeSets.overrides.get(requestPath) ?? routeSets.overrides.get(resolvedPath);
  const isKnownRoute = routeSets.twoHundred.has(requestPath) || routeSets.twoHundred.has(resolvedPath);

  return {
    requestPath,
    resolvedPath,
    overrideStatus,
    isKnownRoute,
    document,
  };
});
