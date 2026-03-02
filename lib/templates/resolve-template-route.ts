import type { PageDocument } from "@/lib/mirror/types";
import { resolveMirrorRoute } from "@/lib/mirror/resolve-route";

export type TemplateRouteResolution =
  | {
      status: "ok";
      document: PageDocument;
      requestPath: string;
      resolvedPath: string;
    }
  | {
      status: "bad-request";
    }
  | {
      status: "not-found";
    };

export async function resolveTemplateRoute(pathValue: string): Promise<TemplateRouteResolution> {
  const route = await resolveMirrorRoute(pathValue);

  if (route.overrideStatus === 400) {
    return {
      status: "bad-request",
    };
  }

  if (route.overrideStatus === 404 || !route.isKnownRoute || !route.document) {
    return {
      status: "not-found",
    };
  }

  return {
    status: "ok",
    document: route.document,
    requestPath: route.requestPath,
    resolvedPath: route.resolvedPath,
  };
}
