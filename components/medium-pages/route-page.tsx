import { MediumStaticTemplate } from "@/components/medium-pages/templates";
import { type MediumStaticPath, getMediumStaticPageConfig } from "@/lib/medium-pages/content";

export function MediumStaticRoutePage({ path }: { path: MediumStaticPath }) {
  const page = getMediumStaticPageConfig(path);
  return <MediumStaticTemplate page={page} />;
}
