import { notFound } from "next/navigation";

import { DocumentView } from "@/components/mirror/document-view";
import { getDocumentByPath, loadRouteSets } from "@/lib/mirror/loaders";

export default async function HomePage() {
  const routeSets = await loadRouteSets();
  if (!routeSets.twoHundred.has("/")) {
    notFound();
  }

  const document = await getDocumentByPath("/");
  if (!document) {
    notFound();
  }

  return <DocumentView document={document} />;
}
