import type { Metadata } from "next";

import { toBlobUrl } from "@/lib/assets/blob-rewrite";
import type { NativePageDocument } from "@/lib/native-content/content-loader";

function normalizeBrandTitle(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return value.replace(/\bMekor 3\b/g, "Mekor Habracha");
}

export function buildDocumentMetadata(document: NativePageDocument | null): Metadata {
  if (!document) {
    return {
      title: "Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const ogImage = document.ogImage ? toBlobUrl(document.ogImage) : "";

  return {
    title: normalizeBrandTitle(document.title),
    description: document.description,
    alternates: {
      canonical: document.canonical,
    },
    openGraph: {
      title: normalizeBrandTitle(document.ogTitle),
      description: document.ogDescription,
      images: ogImage ? [ogImage] : [],
      url: document.canonical,
      type: "website",
    },
    twitter: {
      card:
        (document.twitterCard as "summary" | "summary_large_image") || "summary_large_image",
      title: normalizeBrandTitle(document.twitterTitle),
      description: document.twitterDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}
