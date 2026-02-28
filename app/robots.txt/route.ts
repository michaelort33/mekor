import { NextResponse } from "next/server";

export const dynamic = "force-static";

const robots = `User-agent: *
Allow: /
Disallow: *?lightbox=

# Optimization for Google Ads Bot
User-agent: AdsBot-Google-Mobile
User-agent: AdsBot-Google
Disallow: /_partials*
Disallow: /pro-gallery-webapp/v1/galleries/*

# Block PetalBot
User-agent: PetalBot
Disallow: /

# Crawl delay for overly enthusiastic bots
User-agent: dotbot
Crawl-delay: 10
User-agent: AhrefsBot
Crawl-delay: 10

Sitemap: https://www.mekorhabracha.org/sitemap.xml

# Auto generated, go to SEO Tools > Robots.txt Editor to change this`;

export async function GET() {
  return new NextResponse(robots, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
