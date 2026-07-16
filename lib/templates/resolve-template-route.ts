import type { NativeContentDocument, NativeTemplateRecord } from "@/lib/content/types";
import { resolveContentPath } from "@/lib/content/native-content";
import { getKosherPlaceCorrection } from "@/lib/kosher/corrections";

function applyKosherPlaceCorrection(
  document: NativeContentDocument,
  template: NativeTemplateRecord,
) {
  const correction = getKosherPlaceCorrection(document.path);
  if (!correction) {
    return { document, template };
  }

  const correctedDocument: NativeContentDocument = {
    ...document,
    title: correction.title,
    ogTitle: correction.title,
    twitterTitle: correction.title,
  };

  if (template.kind !== "article" || template.data.type !== "post") {
    return { document: correctedDocument, template };
  }

  const correctedTemplate: NativeTemplateRecord = {
    ...template,
    document: correctedDocument,
    data: {
      ...template.data,
      title: correction.title,
      tags: correction.tagPaths.map((href) => ({
        href,
        label: "Restaurants",
      })),
    },
  };

  return { document: correctedDocument, template: correctedTemplate };
}

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

  const corrected = applyKosherPlaceCorrection(route.document, route.template);

  return {
    status: "ok",
    document: corrected.document,
    template: corrected.template,
    requestPath: route.requestPath,
    resolvedPath: route.resolvedPath,
  };
}
