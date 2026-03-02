import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DocumentView } from "@/components/mirror/document-view";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";

const PATH = "/membership" as const;

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function MembershipPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return <DocumentView document={document} />;
}
