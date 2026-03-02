import { MediumStaticRoutePage } from "@/components/medium-pages/route-page";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";

const PATH = "/donations" as const;

export async function generateMetadata() {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default function Page() {
  return <MediumStaticRoutePage path={PATH} />;
}
