import { NextResponse } from "next/server";

import { requireAdminActor } from "@/lib/admin/actor";
import {
  isTemplateVersionPath,
  readTemplateBlobHtml,
} from "@/lib/newsletter/template-blob";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseTemplateId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

export async function GET(request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { id: rawId } = await context.params;
  const id = parseTemplateId(rawId);
  if (!id) {
    return NextResponse.json({ error: "Invalid template id." }, { status: 400 });
  }

  const pathname = new URL(request.url).searchParams.get("pathname")?.trim() || "";
  if (!pathname) {
    return NextResponse.json({ error: "pathname is required." }, { status: 400 });
  }
  if (!isTemplateVersionPath(id, pathname)) {
    return NextResponse.json({ error: "Invalid blob pathname." }, { status: 400 });
  }

  try {
    const html = await readTemplateBlobHtml(pathname);
    return NextResponse.json({ pathname, html });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Blob read failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
