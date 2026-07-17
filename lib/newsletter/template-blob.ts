import { createHash, randomBytes } from "node:crypto";

import { del, get, list, put } from "@vercel/blob";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import {
  MAX_NEWSLETTER_BLOB_BYTES,
  MAX_NEWSLETTER_HTML_CHARS,
  sanitizeNewsletterHtml,
} from "@/lib/newsletter/html-sanitize";

export type TemplateBlobVersion = {
  pathname: string;
  url: string;
  downloadedUrl?: string;
  size: number;
  uploadedAt: string;
};

export type TemplateBlobMeta = {
  promptSummary?: string;
  actorUserId?: number;
  createdAt: string;
  byteLength: number;
  contentSha256: string;
};

function assertBlobConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for newsletter template versions");
  }
}

export function templateBlobPrefix(templateId: number) {
  return `mekor/newsletters/templates/${templateId}`;
}

export function templateVersionsPrefix(templateId: number) {
  return `${templateBlobPrefix(templateId)}/versions/`;
}

export function buildVersionPathname(templateId: number, label?: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const shortId = randomBytes(3).toString("hex");
  const safeLabel = (label ?? "version")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${templateVersionsPrefix(templateId)}${stamp}-${safeLabel || "version"}-${shortId}.html`;
}

export function isTemplateVersionPath(templateId: number, pathname: string) {
  const prefix = templateVersionsPrefix(templateId);
  return pathname.startsWith(prefix) && pathname.endsWith(".html") && !pathname.includes("..");
}

export async function listTemplateBlobVersions(templateId: number): Promise<TemplateBlobVersion[]> {
  assertBlobConfigured();
  const prefix = templateVersionsPrefix(templateId);
  const versions: TemplateBlobVersion[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix, cursor, limit: 100 });
    for (const blob of page.blobs) {
      if (!blob.pathname.endsWith(".html")) continue;
      versions.push({
        pathname: blob.pathname,
        url: blob.url,
        downloadedUrl: "downloadUrl" in blob ? String((blob as { downloadUrl?: string }).downloadUrl ?? "") : undefined,
        size: blob.size,
        uploadedAt: blob.uploadedAt.toISOString(),
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return versions.sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
}

export async function readTemplateBlobHtml(pathname: string): Promise<string> {
  assertBlobConfigured();
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Blob not found: ${pathname}`);
  }

  const chunks: Buffer[] = [];
  const reader = result.stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function writeTemplateBlobVersion(input: {
  templateId: number;
  html: string;
  actorUserId?: number;
  promptSummary?: string;
  label?: string;
  activate?: boolean;
}) {
  assertBlobConfigured();
  const sanitized = sanitizeNewsletterHtml(input.html);
  if (!sanitized) {
    throw new Error("Cannot write an empty HTML version");
  }
  if (Buffer.byteLength(sanitized, "utf8") > MAX_NEWSLETTER_BLOB_BYTES) {
    throw new Error(`HTML exceeds ${MAX_NEWSLETTER_BLOB_BYTES} byte Blob limit`);
  }
  if (sanitized.length > MAX_NEWSLETTER_HTML_CHARS) {
    throw new Error(`HTML exceeds ${MAX_NEWSLETTER_HTML_CHARS} character limit`);
  }

  const pathname = buildVersionPathname(input.templateId, input.label);
  const bytes = Buffer.from(sanitized, "utf8");
  const meta: TemplateBlobMeta = {
    promptSummary: input.promptSummary,
    actorUserId: input.actorUserId,
    createdAt: new Date().toISOString(),
    byteLength: bytes.byteLength,
    contentSha256: createHash("sha256").update(bytes).digest("hex"),
  };

  const htmlBlob = await put(pathname, bytes, {
    access: "private",
    contentType: "text/html; charset=utf-8",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  const metaPath = pathname.replace(/\.html$/, ".meta.json");
  await put(metaPath, Buffer.from(JSON.stringify(meta, null, 2), "utf8"), {
    access: "private",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const latestPath = `${templateBlobPrefix(input.templateId)}/latest.html`;
  if (input.activate) {
    await put(latestPath, bytes, {
      access: "private",
      contentType: "text/html; charset=utf-8",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  }

  let template = null;
  if (input.activate) {
    template = await activateTemplateBlobVersion({
      templateId: input.templateId,
      pathname: htmlBlob.pathname,
      url: htmlBlob.url,
      html: sanitized,
      versionId: htmlBlob.pathname,
    });
  }

  return {
    pathname: htmlBlob.pathname,
    url: htmlBlob.url,
    meta,
    template,
  };
}

export async function activateTemplateBlobVersion(input: {
  templateId: number;
  pathname: string;
  url?: string;
  html?: string;
  versionId?: string;
}) {
  if (!isTemplateVersionPath(input.templateId, input.pathname)) {
    throw new Error("Invalid template version pathname");
  }

  const html = sanitizeNewsletterHtml(input.html ?? (await readTemplateBlobHtml(input.pathname)));
  if (!html) {
    throw new Error("Activated version HTML is empty");
  }

  const [existing] = await getDb()
    .select({ activeBlobUrl: newsletterTemplates.activeBlobUrl })
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, input.templateId))
    .limit(1);

  const [row] = await getDb()
    .update(newsletterTemplates)
    .set({
      bodyHtml: html,
      activeBlobPathname: input.pathname,
      activeBlobUrl: input.url ?? existing?.activeBlobUrl ?? null,
      activeBlobVersionId: input.versionId ?? input.pathname,
      updatedAt: new Date(),
    })
    .where(eq(newsletterTemplates.id, input.templateId))
    .returning();

  if (!row) {
    throw new Error("Template not found");
  }

  return row;
}

export async function seedTemplateBlobFromBodyHtml(input: {
  templateId: number;
  bodyHtml: string;
  actorUserId?: number;
}) {
  const existing = await listTemplateBlobVersions(input.templateId).catch(() => []);
  if (existing.length > 0) {
    return { seeded: false as const, versions: existing };
  }

  if (!input.bodyHtml.trim()) {
    return { seeded: false as const, versions: [] as TemplateBlobVersion[] };
  }

  const written = await writeTemplateBlobVersion({
    templateId: input.templateId,
    html: input.bodyHtml,
    actorUserId: input.actorUserId,
    promptSummary: "Seeded from existing body_html",
    label: "initial",
    activate: true,
  });

  return {
    seeded: true as const,
    versions: await listTemplateBlobVersions(input.templateId),
    written,
  };
}

export async function deleteTemplateBlobVersion(templateId: number, pathname: string) {
  assertBlobConfigured();
  if (!isTemplateVersionPath(templateId, pathname)) {
    throw new Error("Invalid template version pathname");
  }

  const [template] = await getDb()
    .select({ activeBlobPathname: newsletterTemplates.activeBlobPathname })
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, templateId))
    .limit(1);

  if (template?.activeBlobPathname === pathname) {
    throw new Error("Cannot delete the active Blob version");
  }

  await del(pathname);
  const metaPath = pathname.replace(/\.html$/, ".meta.json");
  await del(metaPath).catch(() => undefined);
}
