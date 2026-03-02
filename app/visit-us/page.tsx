import { MediumStaticRoutePage } from "@/components/medium-pages/route-page";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import type { Metadata } from "next";

const PATH = "/visit-us" as const;

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default function VisitUsPage() {
  return <MediumStaticRoutePage path={PATH} />;
}
