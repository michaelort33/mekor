import type { Metadata } from "next";

import {
  absoluteSiteUrl,
  DEFAULT_SOCIAL_IMAGE,
  SITE_NAME,
} from "@/lib/seo/site";

type PageMetadataInput = {
  path: string;
  title: string;
  description: string;
  image?: string | null;
  type?: "website" | "article";
  noIndex?: boolean;
};

export function buildPageMetadata({
  path,
  title,
  description,
  image,
  type = "website",
  noIndex = false,
}: PageMetadataInput): Metadata {
  const canonical = absoluteSiteUrl(path);
  const socialImage = image ? absoluteSiteUrl(image) : DEFAULT_SOCIAL_IMAGE;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "en_US",
      type,
      images: [{ url: socialImage, alt: `${title} — ${SITE_NAME}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  };
}
