import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ManualKosherPlacePage } from "@/components/kosher/manual-kosher-place-page";
import { ArticleTemplate } from "@/components/templates/article-template";
import { BadRequestTemplate } from "@/components/templates/bad-request-template";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { resolveTemplateRoute } from "@/lib/templates/resolve-template-route";
import { loadNativeContentIndex } from "@/lib/native-content/content-loader";
import { isHiddenContentPath } from "@/lib/content/hidden-paths";
import { getManualKosherPlace, MANUAL_KOSHER_PLACES } from "@/lib/kosher/manual-places";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamicParams = true;
export const dynamic = "force-static";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function toPath(slug: string) {
  return "/post/" + slug;
}

export async function generateStaticParams() {
  const index = await loadNativeContentIndex();
  const deduped = new Map<string, { slug: string }>();
  const seenNormalizedSlugs = new Set<string>();

  for (const item of index) {
    if (item.type !== "post" || !item.path.startsWith("/post/") || item.path.includes("?")) {
      continue;
    }

    if (isHiddenContentPath(item.path)) {
      continue;
    }

    const slug = item.path.slice("/post/".length);
    if (!slug) {
      continue;
    }

    const normalizedSlug = decodeURIComponent(slug).trim().toLowerCase();
    if (seenNormalizedSlugs.has(normalizedSlug)) {
      continue;
    }

    seenNormalizedSlugs.add(normalizedSlug);
    deduped.set(slug, { slug });
  }

  for (const place of MANUAL_KOSHER_PLACES) {
    deduped.set(place.slug, { slug: place.slug });
  }

  return [...deduped.values()];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const manualPlace = getManualKosherPlace(toPath(slug));
  if (manualPlace) {
    return buildPageMetadata({
      path: manualPlace.path,
      title: `${manualPlace.title} | Kosher Guide`,
      description: `${manualPlace.summary}. ${manualPlace.address}`,
    });
  }

  if (isHiddenContentPath(toPath(slug))) {
    return buildDocumentMetadata(null);
  }
  const route = await resolveTemplateRoute(toPath(slug));
  if (route.status !== "ok" || route.document.type !== "post") {
    return buildDocumentMetadata(null);
  }

  return buildDocumentMetadata(route.document);
}

export default async function PostTemplatePage({ params }: PageProps) {
  const { slug } = await params;

  const manualPlace = getManualKosherPlace(toPath(slug));
  if (manualPlace) {
    return <ManualKosherPlacePage place={manualPlace} />;
  }

  if (isHiddenContentPath(toPath(slug))) {
    notFound();
  }

  const route = await resolveTemplateRoute(toPath(slug));

  if (route.status === "bad-request") {
    return <BadRequestTemplate />;
  }

  if (route.status !== "ok" || route.document.type !== "post" || route.template.kind !== "article") {
    notFound();
  }

  return <ArticleTemplate data={route.template.data} />;
}
