import { permanentRedirect } from "next/navigation";

import { buildKosherTagRedirect } from "@/lib/kosher/public-routing";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TagArchivePage({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(buildKosherTagRedirect(slug));
}
