import type { NativeContentDocument, NativeTemplateRecord } from "@/lib/content/types";
import { resolveContentPath } from "@/lib/content/native-content";

export type TemplateRouteResolution =
  | {
      status: "ok";
      document: NativeContentDocument;
      template: NativeTemplateRecord;
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
  const route = await resolveContentPath(pathValue);

  if (route.overrideStatus === 400) {
    return {
      status: "bad-request",
    };
  }

  if (route.overrideStatus === 404 || !route.isKnownRoute || !route.document || !route.template) {
    return {
      status: "not-found",
    };
  }

  return {
    status: "ok",
    document: route.document,
    template: route.template,
    requestPath: route.requestPath,
    resolvedPath: route.resolvedPath,
  };
}
