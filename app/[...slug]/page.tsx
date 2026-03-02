import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentView } from "@/components/mirror/document-view";
import { NATIVE_ROUTE_SET } from "@/lib/native-routes";
import { loadContentIndex } from "@/lib/mirror/loaders";
import { NATIVE_APP_PATHS as NATIVE_ROLLOUT_PATHS } from "@/lib/mirror/native-rollout";
import { loadMirrorDocumentForPath } from "@/lib/mirror/resolve-route";
import { MirrorBadRequestView, resolveMirrorRenderResult } from "@/lib/mirror/render-route";
import { normalizePath } from "@/lib/mirror/url";
import { getEffectiveRenderMode, listConfiguredRenderModes } from "@/lib/routing/render-mode";

export const dynamicParams = true;
export const dynamic = "force-static";

const EXTRA_NATIVE_PATHS = new Set([
  "/about-us",
  "/from-the-rabbi-s-desk",
  "/israel",
  "/kosher-map",
  "/our-rabbi",
  "/team-4",
]);

const MANAGED_APP_PATHS = new Set([
  ...NATIVE_ROUTE_SET,
  ...NATIVE_ROLLOUT_PATHS,
  ...EXTRA_NATIVE_PATHS,
  ...listConfiguredRenderModes().map((entry) => entry.path),
]);
type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

function toPath(slug?: string[]) {
  if (!slug || slug.length === 0) {
    return "/";
  }

  return `/${slug.join("/")}`;
}

function normalizeBrandTitle(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return value.replace(/\bMekor 3\b/g, "Mekor Habracha");
}

export async function generateStaticParams() {
  const index = await loadContentIndex();
  const deduped = new Map<string, { slug: string[] }>();

  for (const item of index) {
    const normalized = normalizePath(item.path);
    if (
      normalized === "/" ||
      MANAGED_APP_PATHS.has(normalized) ||
      normalized.includes("?") ||
      normalized.startsWith("/_files/")
    ) {
      continue;
    }

    const slug = normalized.replace(/^\//, "").split("/").filter(Boolean);
    if (slug.length === 0) {
      continue;
    }

    deduped.set(slug.join("/"), { slug });
  }

  return [...deduped.values()];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const requestPath = toPath(slug);
  const { document: doc } = await loadMirrorDocumentForPath(requestPath);

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

export default async function CatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const requestPath = toPath(slug);
  const resolved = await resolveMirrorRenderResult(requestPath);

  if (resolved.kind === "not-found") {
    notFound();
  }

  if (resolved.kind === "bad-request") {
    return <MirrorBadRequestView />;
  }

  if (getEffectiveRenderMode(requestPath) === "native") {
    notFound();
  }

  return <DocumentView document={resolved.document} />;
}
