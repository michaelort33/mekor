import type { Metadata } from "next";

import { loadMirrorDocumentForPath } from "@/lib/mirror/resolve-route";

function normalizeBrandTitle(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return value.replace(/\bMekor 3\b/g, "Mekor Habracha");
}

export async function getMirrorRouteMetadata(path: string): Promise<Metadata> {
  const { document: doc } = await loadMirrorDocumentForPath(path);

  if (!doc) {
    return {
      title: "Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: normalizeBrandTitle(doc.title),
    description: doc.description,
    alternates: {
      canonical: doc.canonical,
    },
    openGraph: {
      title: normalizeBrandTitle(doc.ogTitle),
      description: doc.ogDescription,
      images: doc.ogImage ? [doc.ogImage] : [],
      url: doc.canonical,
      type: "website",
    },
    twitter: {
      card: (doc.twitterCard as "summary" | "summary_large_image") || "summary_large_image",
      title: normalizeBrandTitle(doc.twitterTitle),
      description: doc.twitterDescription,
      images: doc.ogImage ? [doc.ogImage] : [],
    },
  };
}
