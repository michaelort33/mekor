import { NextResponse } from "next/server";

export const dynamic = "force-static";

const privatePaths = [
  "/api/",
  "/admin/",
  "/account/",
  "/members/",
  "/community/",
  "/member-events/",
  "/profile/",
  "/invite/",
];

function rulesFor(userAgent: string) {
  return [
    `User-agent: ${userAgent}`,
    "Allow: /",
    ...privatePaths.map((path) => `Disallow: ${path}`),
  ].join("\n");
}

const robots = [
  rulesFor("*"),
  rulesFor("OAI-SearchBot"),
  rulesFor("GPTBot"),
  rulesFor("ChatGPT-User"),
  "Sitemap: https://www.mekorhabracha.org/sitemap.xml",
].join("\n\n");

export async function GET() {
  return new NextResponse(robots, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
