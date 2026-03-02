import { notFound } from "next/navigation";

import { DocumentView } from "@/components/mirror/document-view";
import { resolveMirrorRoute } from "@/lib/mirror/resolve-route";
import type { PageDocument } from "@/lib/mirror/types";

export type MirrorRouteRenderResolution =
  | {
      kind: "not-found";
    }
  | {
      kind: "bad-request";
    }
  | {
      kind: "document";
      document: PageDocument;
    };

export async function resolveMirrorRenderResult(pathValue: string): Promise<MirrorRouteRenderResolution> {
  const route = await resolveMirrorRoute(pathValue);
  const overrideStatus = route.overrideStatus;

  if (overrideStatus === 404) {
    return { kind: "not-found" };
  }

  if (overrideStatus === 400) {
    return { kind: "bad-request" };
  }

  if (!route.isKnownRoute || !route.document) {
    return { kind: "not-found" };
  }

  return {
    kind: "document",
    document: route.document,
  };
}

export function MirrorBadRequestView() {
  return (
    <main className="mirror-error">
      <h1>400 - Bad Request</h1>
      <p>This request path is intentionally preserved as a bad request route.</p>
    </main>
  );
}

export async function renderMirrorRoute(pathValue: string) {
  const resolved = await resolveMirrorRenderResult(pathValue);

  if (resolved.kind === "not-found") {
    notFound();
  }

  if (resolved.kind === "bad-request") {
    return <MirrorBadRequestView />;
  }

  return <DocumentView document={resolved.document} />;
}
