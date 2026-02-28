import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DocumentView } from "@/components/mirror/document-view";
import { getDocumentByPath, loadRouteSets, resolveRequestPath } from "@/lib/mirror/loaders";

export const dynamic = "force-dynamic";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const requestPath = toPath(slug);
  const resolved = await resolveRequestPath(requestPath);
  const doc = await getDocumentByPath(resolved.resolved);

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
  if (resolved.redirected) {
    redirect(resolved.resolved);
  }

  const routeSets = await loadRouteSets();
  const overrideStatus = routeSets.overrides.get(resolved.resolved);

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

  if (!routeSets.twoHundred.has(resolved.resolved)) {
    notFound();
  }

  const document = await getDocumentByPath(resolved.resolved);
  if (!document) {
    notFound();
  }

  return <DocumentView document={document} />;
}
