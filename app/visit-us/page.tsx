import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/mirror/document-view";
import type { Metadata } from "next";

const PATH = "/visit-us" as const;

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function VisitUsPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return <DocumentView document={document} />;
}
