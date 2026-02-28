import { notFound } from "next/navigation";

import { DocumentView } from "@/components/mirror/document-view";
import { resolveMirrorRoute } from "@/lib/mirror/resolve-route";

export const dynamic = "force-static";

export default async function HomePage() {
  const route = await resolveMirrorRoute("/");

  if (route.overrideStatus === 404 || !route.isKnownRoute || !route.document) {
    notFound();
  }

  return <DocumentView document={route.document} />;
}
