import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentView } from "@/components/mirror/document-view";
import { NATIVE_ROUTE_SET } from "@/lib/native-routes";
import { loadContentIndex } from "@/lib/mirror/loaders";
import { NATIVE_APP_PATHS as NATIVE_ROLLOUT_PATHS } from "@/lib/mirror/native-rollout";
import { loadMirrorDocumentForPath } from "@/lib/mirror/resolve-route";
import { MirrorBadRequestView, resolveMirrorRenderResult } from "@/lib/mirror/render-route";
import { normalizePath } from "@/lib/mirror/url";
import { NATIVE_APP_ROUTE_PATHS, NATIVE_TEMPLATE_PREFIXES } from "@/lib/routing/native-app-routes";
import { getEffectiveRenderMode, listConfiguredRenderModes } from "@/lib/routing/render-mode";
import { buildDocumentMetadata } from "@/lib/templates/metadata";

export const dynamicParams = true;
export const dynamic = "force-static";

const MANAGED_APP_PATHS = new Set([
  ...NATIVE_ROUTE_SET,
  ...NATIVE_ROLLOUT_PATHS,
  ...NATIVE_APP_ROUTE_PATHS,
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
