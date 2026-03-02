import { notFound } from "next/navigation";

import { DocumentView } from "@/components/mirror/document-view";
import { resolveMirrorRoute } from "@/lib/mirror/resolve-route";

export async function renderMirrorFallbackForPath(path: string) {
  const route = await resolveMirrorRoute(path);

  if (route.overrideStatus === 404 || !route.isKnownRoute || !route.document) {
    notFound();
  }

  return <DocumentView document={route.document} />;
}
