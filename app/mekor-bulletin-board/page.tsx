import { MediumStaticRoutePage } from "@/components/medium-pages/route-page";
import { getMirrorPageMetadata } from "@/lib/seo/mirror-metadata";

const PATH = "/mekor-bulletin-board" as const;

export async function generateMetadata() {
  return getMirrorPageMetadata(PATH);
}

export default function Page() {
  return <MediumStaticRoutePage path={PATH} />;
}
