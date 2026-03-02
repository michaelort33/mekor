import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BadRequestTemplate } from "@/components/templates/bad-request-template";
import { ProfileTemplate } from "@/components/templates/profile-template";
import { loadContentIndex } from "@/lib/mirror/loaders";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { resolveTemplateRoute } from "@/lib/templates/resolve-template-route";
import { buildProfileTemplateData } from "@/lib/templates/template-data";

export const dynamicParams = true;
export const dynamic = "force-static";

type PageProps = {
  params: Promise<{
    parts?: string[];
  }>;
};

function toPath(parts?: string[]) {
  if (!parts || parts.length === 0) {
    return "/profile";
  }

  return `/profile/${parts.join("/")}`;
}

export async function generateStaticParams() {
  const index = await loadContentIndex();
  const deduped = new Map<string, { parts: string[] }>();

  for (const item of index) {
    if (
      item.type !== "profile" ||
      !item.path.startsWith("/profile/") ||
      item.path.includes("?")
    ) {
      continue;
    }

    const parts = item.path.slice("/profile/".length).split("/").filter(Boolean);
    if (parts.length === 0) {
      continue;
    }

    deduped.set(parts.join("/"), { parts });
  }

  return [...deduped.values()];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { parts } = await params;
  const route = await resolveTemplateRoute(toPath(parts));
  if (route.status !== "ok" || route.document.type !== "profile") {
    return buildDocumentMetadata(null);
  }

  return buildDocumentMetadata(route.document);
}

export default async function ProfileTemplatePage({ params }: PageProps) {
  const { parts } = await params;
  const route = await resolveTemplateRoute(toPath(parts));

  if (route.status === "bad-request") {
    return <BadRequestTemplate />;
  }

  if (route.status !== "ok" || route.document.type !== "profile") {
    notFound();
  }

  const data = await buildProfileTemplateData(route.document);
  return <ProfileTemplate data={data} />;
}
