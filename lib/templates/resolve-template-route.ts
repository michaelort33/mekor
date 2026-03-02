import type { NativePageDocument } from "@/lib/native-content/content-loader";
import { resolveNativeTemplatePath } from "@/lib/native-content/content-loader";

export type TemplateRouteResolution =
  | {
      status: "ok";
      document: NativePageDocument;
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
  const route = await resolveNativeTemplatePath(pathValue);

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
