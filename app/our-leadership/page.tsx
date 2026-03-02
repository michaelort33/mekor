import type { Metadata } from "next";

import { MediumStaticRoutePage } from "@/components/medium-pages/route-page";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";

const PATH = "/our-leadership" as const;

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default function OurLeadershipPage() {
  return <MediumStaticRoutePage path={PATH} />;
}
