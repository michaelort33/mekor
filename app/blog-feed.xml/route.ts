import { NextResponse } from "next/server";

import { listDocumentsByType } from "@/lib/mirror/loaders";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await listDocumentsByType("post");
  const sorted = posts
    .slice()
    .sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1))
    .slice(0, 150);

  const latest = sorted[0]?.capturedAt ? new Date(sorted[0].capturedAt).toUTCString() : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title><![CDATA[Mekor 2]]></title>
<description><![CDATA[Mekor 3]]></description>
<link>https://www.mekorhabracha.org/kosher-posts</link>
<generator>RSS for Node</generator>
<lastBuildDate>${latest}</lastBuildDate>
<atom:link href="https://www.mekorhabracha.org/blog-feed.xml" rel="self" type="application/rss+xml"/>
${sorted
  .map((post) => {
    const pubDate = new Date(post.capturedAt).toUTCString();
    const description = post.description || post.text.slice(0, 250);
    const firstImage = post.assets.find((asset) => /\.(png|jpe?g|gif|webp)/i.test(asset));

    return `<item>
<title><![CDATA[${post.title || post.path}]]></title>
<description><![CDATA[${description}]]></description>
<link>https://www.mekorhabracha.org${post.path}</link>
<guid isPermaLink="false">${post.id}</guid>
<pubDate>${pubDate}</pubDate>
${firstImage ? `<enclosure url="${escapeXml(firstImage)}" length="0" type="image/png"/>` : ""}
</item>`;
  })
  .join("\n")}
</channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
