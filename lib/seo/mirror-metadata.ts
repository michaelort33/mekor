import type { Metadata } from "next";

import { getDocumentByPath } from "@/lib/mirror/loaders";

function normalizeBrandTitle(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return value.replace(/\bMekor 3\b/g, "Mekor Habracha");
}

export async function getMirrorPageMetadata(path: string): Promise<Metadata> {
  const document = await getDocumentByPath(path);

  if (!document) {
    return {
      title: "Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: normalizeBrandTitle(document.title),
    description: document.description,
    alternates: {
      canonical: document.canonical,
    },
    openGraph: {
      title: normalizeBrandTitle(document.ogTitle),
      description: document.ogDescription,
      images: document.ogImage ? [document.ogImage] : [],
      url: document.canonical,
      type: "website",
    },
    twitter: {
      card: (document.twitterCard as "summary" | "summary_large_image") || "summary_large_image",
      title: normalizeBrandTitle(document.twitterTitle),
      description: document.twitterDescription,
      images: document.ogImage ? [document.ogImage] : [],
    },
  };
}
