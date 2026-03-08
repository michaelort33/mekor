import { permanentRedirect } from "next/navigation";

import { buildKosherCategoryRedirect } from "@/lib/kosher/public-routing";

type PageProps = {
  params: Promise<{
    slug: string;
    page: string;
  }>;
};

export default async function CategoryArchivePagedPage({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(buildKosherCategoryRedirect(slug));
}
