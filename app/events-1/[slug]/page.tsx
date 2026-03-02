import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BadRequestTemplate } from "@/components/templates/bad-request-template";
import { EventTemplate } from "@/components/templates/event-template";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { resolveTemplateRoute } from "@/lib/templates/resolve-template-route";
import { buildEventTemplateData } from "@/lib/templates/template-data";
import { loadNativeContentIndex } from "@/lib/native-content/content-loader";

export const dynamicParams = true;
export const dynamic = "force-static";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function toPath(slug: string) {
  return `/events-1/${slug}`;
}

export async function generateStaticParams() {
  const index = await loadNativeContentIndex();
  const deduped = new Map<string, { slug: string }>();

  for (const item of index) {
    if (item.type !== "event" || !item.path.startsWith("/events-1/") || item.path.includes("?")) {
      continue;
    }

    const slug = item.path.slice("/events-1/".length);
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
  if (route.status !== "ok" || route.document.type !== "event") {
    return buildDocumentMetadata(null);
  }

  return buildDocumentMetadata(route.document);
}

export default async function EventTemplatePage({ params }: PageProps) {
  const { slug } = await params;
  const route = await resolveTemplateRoute(toPath(slug));

  if (route.status === "bad-request") {
    return <BadRequestTemplate />;
  }

  if (route.status !== "ok" || route.document.type !== "event") {
    notFound();
  }

  return <EventTemplate data={buildEventTemplateData(route.document)} />;
}
