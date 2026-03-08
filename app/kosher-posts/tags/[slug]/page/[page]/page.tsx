import { permanentRedirect } from "next/navigation";

import { buildKosherTagRedirect } from "@/lib/kosher/public-routing";

type PageProps = {
  params: Promise<{
    slug: string;
    page: string;
  }>;
};

export default async function TagArchivePagedPage({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(buildKosherTagRedirect(slug));
}
