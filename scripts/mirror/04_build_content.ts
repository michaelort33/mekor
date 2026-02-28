import fs from "node:fs/promises";
import path from "node:path";

import { load as loadHtml } from "cheerio";

import {
  CONTENT_DIR,
  SEO_DIR,
  SNAPSHOT_DIR,
  classifyDocumentType,
  ensureMirrorDirs,
  hashSha1,
  isSourceHost,
  slugFromPath,
  toLocalMirrorPath,
  toAbsoluteUrl,
  writeJson,
} from "./_shared";

type SnapshotRecord = {
  path: string;
  finalPath: string;
  status: number;
  title: string;
  metadata: {
    description: string;
    canonical: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    twitterCard: string;
    twitterTitle: string;
    twitterDescription: string;
  };
  headings: string[];
  links: string[];
  assets: string[];
  styleTags: string[];
  styleLinks: string[];
  bodyHtml: string;
  text: string;
  textHash: string;
  capturedAt: string;
};

type PageDocument = {
  id: string;
  type: ReturnType<typeof classifyDocumentType>;
  path: string;
  url: string;
  slug: string;
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  headings: string[];
  text: string;
  textHash: string;
  links: string[];
  assets: string[];
  renderHtml: string;
  capturedAt: string;
};

function removeNoiseFromBody(html: string) {
  const $ = loadHtml(html);

  $("script").remove();
  $("noscript").remove();
  $("iframe[src*='consent'], iframe[src*='doubleclick']").remove();

  return $.root().html() ?? "";
}

function rewriteSrcset(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [urlPart, ...rest] = part.split(/\s+/);
      const rewritten = toLocalMirrorPath(urlPart);
      return [rewritten, ...rest].join(" ").trim();
    })
    .join(", ");
}

function rewriteStyleUrls(value: string) {
  return value.replace(/url\((['"]?)(https?:\/\/[^'")]+)\1\)/gi, (_, quote, url) => {
    const rewritten = toLocalMirrorPath(String(url));
    return `url(${quote}${rewritten}${quote})`;
  });
}

function rewriteInternalHtml(html: string) {
  const $ = loadHtml(html);
  const hrefLikeAttrs = ["href", "src", "action", "poster", "data-src", "data-href"];

  for (const attr of hrefLikeAttrs) {
    $(`[${attr}]`).each((_, element) => {
      const value = $(element).attr(attr);
      if (!value) return;
      $(element).attr(attr, toLocalMirrorPath(value));
    });
  }

  $("[srcset]").each((_, element) => {
    const value = $(element).attr("srcset");
    if (!value) return;
    $(element).attr("srcset", rewriteSrcset(value));
  });

  $("[style]").each((_, element) => {
    const value = $(element).attr("style");
    if (!value) return;
    $(element).attr("style", rewriteStyleUrls(value));
  });

  $("style").each((_, element) => {
    const css = $(element).html();
    if (!css) return;
    $(element).html(rewriteStyleUrls(css));
  });

  return $.root().html() ?? "";
}

function dedupe(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

async function loadSnapshots() {
  const files = (await fs.readdir(SNAPSHOT_DIR)).filter((file) => file.endsWith(".json"));
  const snapshots: SnapshotRecord[] = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(SNAPSHOT_DIR, file), "utf8");
      const parsed = JSON.parse(content) as SnapshotRecord;
      if (parsed.path) {
        snapshots.push(parsed);
      }
    } catch {
      // skip malformed snapshots
    }
  }

  return snapshots;
}

async function main() {
  await ensureMirrorDirs();

  const snapshots = await loadSnapshots();
  const docByPath = new Map<string, PageDocument>();
  const indexByPath = new Map<string, { path: string; type: string; file: string }>();

  for (const snapshot of snapshots) {
    if (snapshot.status < 200 || snapshot.status >= 400) {
      continue;
    }

    const pathValue = snapshot.finalPath || snapshot.path;
    const type = classifyDocumentType(pathValue);
    const slug = slugFromPath(pathValue);

    const cleanedBody = removeNoiseFromBody(snapshot.bodyHtml || "");
    const styleBundle = [...(snapshot.styleLinks ?? []), ...(snapshot.styleTags ?? [])].join("\n");
    const renderHtml = rewriteInternalHtml(`${styleBundle}\n${cleanedBody}`);

    const text = (snapshot.text || "").replace(/\s+/g, " ").trim();
    const canonical = toLocalMirrorPath(snapshot.metadata?.canonical || pathValue);
    const ogImageRaw = snapshot.metadata?.ogImage || "";
    const ogImage = isSourceHost(ogImageRaw) ? toLocalMirrorPath(ogImageRaw) : ogImageRaw;

    const document: PageDocument = {
      id: hashSha1(pathValue),
      type,
      path: pathValue,
      url: toAbsoluteUrl(pathValue),
      slug,
      title: snapshot.title || "",
      description: snapshot.metadata?.description || "",
      canonical,
      ogTitle: snapshot.metadata?.ogTitle || snapshot.title || "",
      ogDescription: snapshot.metadata?.ogDescription || snapshot.metadata?.description || "",
      ogImage,
      twitterCard: snapshot.metadata?.twitterCard || "summary_large_image",
      twitterTitle: snapshot.metadata?.twitterTitle || snapshot.title || "",
      twitterDescription: snapshot.metadata?.twitterDescription || snapshot.metadata?.description || "",
      headings: dedupe(snapshot.headings ?? []),
      text,
      textHash: snapshot.textHash || hashSha1(text),
      links: dedupe((snapshot.links ?? []).map((value) => toLocalMirrorPath(value))),
      assets: dedupe((snapshot.assets ?? []).map((value) => toLocalMirrorPath(value))),
      renderHtml,
      capturedAt: snapshot.capturedAt || new Date().toISOString(),
    };

    const outFile = path.join(
      "documents",
      type,
      `${slug}--${hashSha1(pathValue).slice(0, 12)}.json`,
    );
    await writeJson(path.join(CONTENT_DIR, outFile), document);

    docByPath.set(pathValue, document);
    indexByPath.set(pathValue, {
      path: pathValue,
      type,
      file: outFile,
    });

    if (snapshot.path && snapshot.path !== pathValue) {
      indexByPath.set(snapshot.path, {
        path: snapshot.path,
        type,
        file: outFile,
      });
    }
  }

  const docs = [...docByPath.values()];
  const index = [...indexByPath.values()];

  docs.sort((a, b) => a.path.localeCompare(b.path));
  index.sort((a, b) => a.path.localeCompare(b.path));

  const metadataByPath = docs.map((doc) => ({
    path: doc.path,
    title: doc.title,
    description: doc.description,
    canonical: doc.canonical,
    ogTitle: doc.ogTitle,
    ogDescription: doc.ogDescription,
    ogImage: doc.ogImage,
    twitterCard: doc.twitterCard,
    twitterTitle: doc.twitterTitle,
    twitterDescription: doc.twitterDescription,
  }));

  await Promise.all([
    writeJson(path.join(CONTENT_DIR, "index.json"), index),
    writeJson(path.join(CONTENT_DIR, "all-documents.json"), docs),
    writeJson(path.join(SEO_DIR, "metadata-by-path.json"), metadataByPath),
    writeJson(path.join(CONTENT_DIR, "content-summary.json"), {
      generatedAt: new Date().toISOString(),
      documentCount: docs.length,
      byType: docs.reduce<Record<string, number>>((acc, doc) => {
        acc[doc.type] = (acc[doc.type] ?? 0) + 1;
        return acc;
      }, {}),
    }),
  ]);

  console.log(`documents=${docs.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
