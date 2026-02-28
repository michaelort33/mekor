import { NextResponse } from "next/server";

import { loadBlobMapByMirrorPath } from "@/lib/mirror/loaders";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  const params = await context.params;
  const rawPath = params.path;
  const pathParts = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const incomingPath = `/_files/ugd/${pathParts.join("/")}`;
  const incomingUrl = new URL(request.url);
  const withQuery = `${incomingPath}${incomingUrl.search || ""}`;

  const blobMapByMirrorPath = await loadBlobMapByMirrorPath();
  const matched = blobMapByMirrorPath.get(withQuery) ?? blobMapByMirrorPath.get(incomingPath);

  if (!matched) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.redirect(matched.blobUrl, {
    status: 307,
    headers: {
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
