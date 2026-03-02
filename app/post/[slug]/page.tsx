import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleTemplate } from "@/components/templates/article-template";
import { BadRequestTemplate } from "@/components/templates/bad-request-template";
import { loadContentIndex } from "@/lib/mirror/loaders";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { resolveTemplateRoute } from "@/lib/templates/resolve-template-route";
import { buildArticleTemplateData } from "@/lib/templates/template-data";

export const dynamicParams = true;
export const dynamic = "force-static";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function toPath(slug: string) {
  return `/post/${slug}`;
}

export async function generateStaticParams() {
  const index = await loadContentIndex();
  const deduped = new Map<string, { slug: string }>();

  for (const item of index) {
    if (item.type !== "post" || !item.path.startsWith("/post/") || item.path.includes("?")) {
      continue;
    }

    const slug = item.path.slice("/post/".length);
    if (!slug) {
      continue;
    }

    deduped.set(slug, { slug });
  }

  return [...deduped.values()];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = await resolveTemplateRoute(toPath(slug));
  if (route.status !== "ok" || route.document.type !== "post") {
    return buildDocumentMetadata(null);
  }

  return buildDocumentMetadata(route.document);
}

export default async function PostTemplatePage({ params }: PageProps) {
  const { slug } = await params;
  const route = await resolveTemplateRoute(toPath(slug));

  if (route.status === "bad-request") {
    return <BadRequestTemplate />;
  }

  if (route.status !== "ok" || route.document.type !== "post") {
    notFound();
  }

  return <ArticleTemplate data={buildArticleTemplateData(route.document)} />;
}
