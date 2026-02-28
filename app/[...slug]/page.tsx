import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentView } from "@/components/mirror/document-view";
import {
  getDocumentByPath,
  loadContentIndex,
  loadRouteSets,
  resolveRequestPath,
} from "@/lib/mirror/loaders";
import { normalizePath } from "@/lib/mirror/url";

export const dynamicParams = false;

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
  const resolved = await resolveRequestPath(requestPath);
  const doc = (await getDocumentByPath(requestPath)) ?? (await getDocumentByPath(resolved.resolved));

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
    title: doc.title,
    description: doc.description,
    alternates: {
      canonical: doc.canonical,
    },
    openGraph: {
      title: doc.ogTitle,
      description: doc.ogDescription,
      images: doc.ogImage ? [doc.ogImage] : [],
      url: doc.canonical,
      type: "website",
    },
    twitter: {
      card: (doc.twitterCard as "summary" | "summary_large_image") || "summary_large_image",
      title: doc.twitterTitle,
      description: doc.twitterDescription,
      images: doc.ogImage ? [doc.ogImage] : [],
    },
  };
}

export default async function CatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const requestPath = toPath(slug);

  const resolved = await resolveRequestPath(requestPath);

  const routeSets = await loadRouteSets();
  const overrideStatus = routeSets.overrides.get(requestPath) ?? routeSets.overrides.get(resolved.resolved);

  if (overrideStatus === 404) {
    notFound();
  }

  if (overrideStatus === 400) {
    return (
      <main className="mirror-error">
        <h1>400 - Bad Request</h1>
        <p>This request path is intentionally preserved as a bad request route.</p>
      </main>
    );
  }

  if (!routeSets.twoHundred.has(requestPath) && !routeSets.twoHundred.has(resolved.resolved)) {
    notFound();
  }

  const document = (await getDocumentByPath(requestPath)) ?? (await getDocumentByPath(resolved.resolved));
  if (!document) {
    notFound();
  }

  return <DocumentView document={document} />;
}
