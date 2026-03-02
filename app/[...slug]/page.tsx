import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentView } from "@/components/mirror/document-view";
import { NATIVE_ROUTE_SET } from "@/lib/native-routes";
import { loadContentIndex } from "@/lib/mirror/loaders";
import { NATIVE_APP_PATHS as NATIVE_ROLLOUT_PATHS } from "@/lib/mirror/native-rollout";
import { loadMirrorDocumentForPath } from "@/lib/mirror/resolve-route";
import { MirrorBadRequestView, resolveMirrorRenderResult } from "@/lib/mirror/render-route";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { normalizePath } from "@/lib/mirror/url";
import { getEffectiveRenderMode, listConfiguredRenderModes } from "@/lib/routing/render-mode";

export const dynamicParams = true;
export const dynamic = "force-static";

const EXTRA_NATIVE_PATHS = new Set([
  "/about-us",
  "/center-city",
  "/center-city-beit-midrash",
  "/cherry-hill",
  "/contact-us",
  "/copy-of-center-city-beit-midrash",
  "/davening",
  "/donations",
  "/events",
  "/from-the-rabbi-s-desk",
  "/general-5",
  "/in-the-news",
  "/israel",
  "/kosher-map",
  "/main-line-manyunk",
  "/mekor-bulletin-board",
  "/old-kosher-restaurants",
  "/old-yorkroad-northeast",
  "/our-communities",
  "/our-rabbi",
  "/philly-jewish-community",
  "/team-4",
  "/testimonials",
  "/visit-us",
]);

const MANAGED_APP_PATHS = new Set([
  ...NATIVE_ROUTE_SET,
  ...NATIVE_ROLLOUT_PATHS,
  ...EXTRA_NATIVE_PATHS,
  ...listConfiguredRenderModes().map((entry) => entry.path),
]);

const NATIVE_TEMPLATE_PREFIXES = [
  "/post/",
  "/news/",
  "/events-1/",
  "/profile/",
  "/kosher-posts/categories/",
  "/kosher-posts/tags/",
];
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

export async function generateStaticParams() {
  const index = await loadContentIndex();
  const deduped = new Map<string, { slug: string[] }>();

  for (const item of index) {
    const normalized = normalizePath(item.path);
    if (
      normalized === "/" ||
      MANAGED_APP_PATHS.has(normalized) ||
      NATIVE_TEMPLATE_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ||
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
  return buildDocumentMetadata(doc);
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
