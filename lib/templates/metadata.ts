import type { Metadata } from "next";

import { toBlobUrl } from "@/lib/assets/blob-rewrite";
import type { NativePageDocument } from "@/lib/native-content/content-loader";
import { buildPageMetadata } from "@/lib/seo/metadata";

function normalizeBrandTitle(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return value.replace(/\bMekor 3\b/g, "Mekor Habracha");
}

function fallbackDescription(document: NativePageDocument) {
  const title = normalizeBrandTitle(document.title) ?? document.title;
  const subject = title.replace(/\s*\|\s*Mekor Habracha.*$/i, "").trim() || title;

  switch (document.type) {
    case "post":
      return `Find location, kosher certification, and dining details for ${subject} in Mekor Habracha's Philadelphia kosher guide.`;
    case "news":
      return `Read ${subject}, a press or community story featuring Mekor Habracha / Center City Synagogue in Philadelphia.`;
    case "event":
      return `View the schedule, location, and participation details for ${subject} at Mekor Habracha / Center City Synagogue.`;
    case "profile":
      return `Learn more about ${subject} and their connection to the Mekor Habracha community.`;
    default:
      return `Learn about ${subject} at Mekor Habracha / Center City Synagogue in Philadelphia.`;
  }
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
  const title = normalizeBrandTitle(document.title) ?? document.title;
  const description =
    document.description.trim() ||
    document.ogDescription.trim() ||
    document.twitterDescription.trim() ||
    fallbackDescription(document);
  const metadata = buildPageMetadata({
    path: document.canonical,
    title,
    description,
    image: ogImage,
    type: document.type === "post" || document.type === "news" ? "article" : "website",
  });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      title: normalizeBrandTitle(document.ogTitle) ?? title,
      description: document.ogDescription.trim() || description,
    },
    twitter: {
      ...metadata.twitter,
      card: (document.twitterCard as "summary" | "summary_large_image") || "summary_large_image",
      title: normalizeBrandTitle(document.twitterTitle) ?? title,
      description: document.twitterDescription.trim() || description,
    },
  };
}
