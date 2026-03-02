import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArchiveTemplate } from "@/components/templates/archive-template";
import { BadRequestTemplate } from "@/components/templates/bad-request-template";
import { loadContentIndex } from "@/lib/mirror/loaders";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { resolveTemplateRoute } from "@/lib/templates/resolve-template-route";
import { buildArchiveTemplateData } from "@/lib/templates/template-data";

export const dynamicParams = true;
export const dynamic = "force-static";

type PageProps = {
  params: Promise<{
    slug: string;
    page: string;
  }>;
};

function toPath(slug: string, page: string) {
  return `/kosher-posts/categories/${slug}/page/${page}`;
}

export async function generateStaticParams() {
  const index = await loadContentIndex();
  const deduped = new Map<string, { slug: string; page: string }>();

  for (const item of index) {
    if (
      item.type !== "category" ||
      item.path.includes("?") ||
      !/^\/kosher-posts\/categories\/[^/]+\/page\/\d+$/i.test(item.path)
    ) {
      continue;
    }

    const match = item.path.match(/^\/kosher-posts\/categories\/([^/]+)\/page\/(\d+)$/i);
    if (!match?.[1] || !match[2]) {
      continue;
    }

    deduped.set(`${match[1]}:${match[2]}`, { slug: match[1], page: match[2] });
  }

  return [...deduped.values()];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, page } = await params;
  const route = await resolveTemplateRoute(toPath(slug, page));
  if (route.status !== "ok" || route.document.type !== "category") {
    return buildDocumentMetadata(null);
  }

  return buildDocumentMetadata(route.document);
}

export default async function CategoryArchivePagedPage({ params }: PageProps) {
  const { slug, page } = await params;
  const route = await resolveTemplateRoute(toPath(slug, page));

  if (route.status === "bad-request") {
    return <BadRequestTemplate />;
  }

  if (route.status !== "ok" || route.document.type !== "category") {
    notFound();
  }

  const data = await buildArchiveTemplateData(route.document);
  return <ArchiveTemplate data={data} />;
}
