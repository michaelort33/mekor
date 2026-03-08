import { NextResponse } from "next/server";

import { listArticles } from "@/lib/content/native-content";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await listArticles("post");
  const sorted = posts
    .slice()
    .sort((a, b) => (a.document.capturedAt < b.document.capturedAt ? 1 : -1))
    .slice(0, 150);

  const latest = sorted[0]?.document.capturedAt
    ? new Date(sorted[0].document.capturedAt).toUTCString()
    : new Date().toUTCString();

  const items = sorted
    .map((post) => {
      if (post.kind !== "article") {
        return "";
      }

      const pubDate = new Date(post.document.capturedAt).toUTCString();
      const description = post.data.subtitle || post.document.description || post.data.body[0] || "";
      const enclosure = post.data.heroImage
        ? '<enclosure url="' + escapeXml(post.data.heroImage) + '" length="0" type="image/png"/>'
        : "";

      return (
        '<item>\n' +
        '<title><![CDATA[' + (post.data.title || post.document.path) + ']]></title>\n' +
        '<description><![CDATA[' + description + ']]></description>\n' +
        '<link>https://www.mekorhabracha.org' + post.document.path + '</link>\n' +
        '<guid isPermaLink="false">' + post.document.id + '</guid>\n' +
        '<pubDate>' + pubDate + '</pubDate>\n' +
        enclosure + '\n' +
        '</item>'
      );
    })
    .filter(Boolean)
    .join("\n");

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">\n' +
    '<channel>\n' +
    '<title><![CDATA[Mekor 2]]></title>\n' +
    '<description><![CDATA[Mekor Habracha kosher listings and community posts]]></description>\n' +
    '<link>https://www.mekorhabracha.org/kosher-posts</link>\n' +
    '<generator>Native Content Feed</generator>\n' +
    '<lastBuildDate>' + latest + '</lastBuildDate>\n' +
    '<atom:link href="https://www.mekorhabracha.org/blog-feed.xml" rel="self" type="application/rss+xml"/>\n' +
    items + '\n' +
    '</channel>\n' +
    '</rss>';

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
