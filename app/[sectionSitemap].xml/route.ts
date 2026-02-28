import { NextResponse } from "next/server";

import { loadRouteData } from "@/lib/mirror/loaders";

export const dynamic = "force-dynamic";

function matchesSection(pathValue: string, section: string) {
  switch (section) {
    case "blog-categories-sitemap":
      return pathValue === "/kosher-posts" || pathValue.startsWith("/kosher-posts/categories/");
    case "blog-posts-sitemap":
      return pathValue.startsWith("/post/");
    case "event-pages-sitemap":
      return pathValue.startsWith("/events-1/");
    case "dynamic-news-sitemap":
      return pathValue.startsWith("/news/");
    case "pages-sitemap":
      return (
        !pathValue.startsWith("/post/") &&
        !pathValue.startsWith("/events-1/") &&
        !pathValue.startsWith("/news/") &&
        !pathValue.startsWith("/kosher-posts/categories/")
      );
    default:
      return false;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  const params = await context.params;
  const rawSection = params.sectionSitemap;
  const sectionSitemap = Array.isArray(rawSection) ? rawSection[0] ?? "" : rawSection ?? "";

  const allowed = new Set([
    "blog-categories-sitemap",
    "blog-posts-sitemap",
    "event-pages-sitemap",
    "dynamic-news-sitemap",
    "pages-sitemap",
  ]);

  if (!allowed.has(sectionSitemap)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { canonical } = await loadRouteData();
  const selected = canonical
    .map((record) => record.path)
    .filter((pathValue) => matchesSection(pathValue, sectionSitemap))
    .sort();

  const lastmod = new Date().toISOString().slice(0, 10);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${selected
  .map(
    (pathValue) => `<url>
<loc>https://www.mekorhabracha.org${pathValue}</loc>
<lastmod>${lastmod}</lastmod>
</url>`,
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
