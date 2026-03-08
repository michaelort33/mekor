import { permanentRedirect } from "next/navigation";

import { buildKosherCategoryRedirect } from "@/lib/kosher/public-routing";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoryArchivePage({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(buildKosherCategoryRedirect(slug));
}
