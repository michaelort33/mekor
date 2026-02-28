import fs from "node:fs/promises";
import path from "node:path";

import { load as loadHtml } from "cheerio";

import {
  ASSETS_DIR,
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

type BlobMapRecord = {
  sourceUrl: string;
  path: string;
  blobKey: string;
  blobUrl: string;
  contentType: string;
  sha1: string;
  size: number;
};

type AssetResolver = {
  resolveUrl: (input: string) => string;
};

function removeNoiseFromBody(html: string) {
  const $ = loadHtml(html);

  $("script").remove();
  $("noscript").remove();
  $("iframe[src*='consent'], iframe[src*='doubleclick']").remove();

  return $.root().html() ?? "";
}

function decodeHtmlAmpersands(value: string) {
  return value.replace(/&amp;/g, "&");
}

function getWixMediaKey(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (!url.hostname.endsWith("wixstatic.com")) {
      return "";
    }

    const match = url.pathname.match(/^\/media\/([^/]+)/);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

async function loadAssetResolver(): Promise<AssetResolver> {
  let blobMap: BlobMapRecord[] = [];
  try {
    blobMap = JSON.parse(await fs.readFile(path.join(ASSETS_DIR, "blob-map.json"), "utf8")) as BlobMapRecord[];
  } catch {
    blobMap = [];
  }

  const bySource = new Map<string, string>();
  const byPath = new Map<string, string>();
  const byWixMedia = new Map<string, string>();

  for (const row of blobMap) {
    const source = decodeHtmlAmpersands((row.sourceUrl ?? "").trim());
    const sourceLower = source.toLowerCase();
    if (sourceLower) {
      bySource.set(sourceLower, row.blobUrl);
    }

    const rowPath = (row.path ?? "").trim();
    if (rowPath) {
      byPath.set(rowPath, row.blobUrl);
    }

    const mediaKey = getWixMediaKey(source);
    if (mediaKey && !byWixMedia.has(mediaKey)) {
      byWixMedia.set(mediaKey, row.blobUrl);
    }
  }

  function resolveUrl(input: string) {
    const raw = decodeHtmlAmpersands((input ?? "").trim());
    if (!raw) {
      return raw;
    }

    const sourceHit = bySource.get(raw.toLowerCase());
    if (sourceHit) {
      return sourceHit;
    }

    try {
      const parsed = new URL(raw);
      const pathWithQuery = `${parsed.pathname}${parsed.search}`;
      const pathHit = byPath.get(pathWithQuery) ?? byPath.get(parsed.pathname);
      if (pathHit) {
        return pathHit;
      }

      const mediaKey = getWixMediaKey(raw);
      if (mediaKey) {
        const mediaHit = byWixMedia.get(mediaKey);
        if (mediaHit) {
          return mediaHit;
        }
      }
    } catch {
      const pathHit = byPath.get(raw);
      if (pathHit) {
        return pathHit;
      }
    }

    return toLocalMirrorPath(raw);
  }

  return {
    resolveUrl,
  };
}

function rewriteStyleUrls(value: string, resolveUrl: (input: string) => string) {
  return value.replace(/url\((['"]?)(https?:\/\/[^'")]+)\1\)/gi, (_, quote, url) => {
    const rewritten = resolveUrl(String(url));
    return `url(${quote}${rewritten}${quote})`;
  });
}

function rewriteInternalHtml(html: string, resolver: AssetResolver) {
  const $ = loadHtml(`<div id="__mirror_root">${html}</div>`);
  const root = $("#__mirror_root");
  const hrefLikeAttrs = ["href", "src", "action", "poster", "data-src", "data-href"];

  for (const attr of hrefLikeAttrs) {
    root.find(`[${attr}]`).each((_, element) => {
      const value = $(element).attr(attr);
      if (!value) return;
      $(element).attr(attr, resolver.resolveUrl(value));
    });
  }

  // Keep srcset values untouched: Wix URLs contain commas in path transforms and splitting/parsing corrupts them.
  root.find("[srcset]").each((_, element) => {
    const value = $(element).attr("srcset");
    if (!value) return;
    $(element).attr("srcset", value);
  });

  root.find("[style]").each((_, element) => {
    const value = $(element).attr("style");
    if (!value) return;
    $(element).attr("style", rewriteStyleUrls(value, resolver.resolveUrl));
  });

  root.find("style").each((_, element) => {
    const css = $(element).html();
    if (!css) return;
    $(element).html(rewriteStyleUrls(css, resolver.resolveUrl));
  });

  const headerMenuTargets: Record<string, string> = {
    "who we are": "/about-us",
    "kosher restaurants": "/kosher-posts",
    more: "/our-communities",
  };

  root.find('nav[aria-label="Site"] li').each((_, li) => {
    const listItem = $(li);
    const button = listItem.find("button").first();
    if (button.length === 0) {
      return;
    }
    const label = button.text().replace(/\s+/g, " ").trim().toLowerCase();
    const target = headerMenuTargets[label];
    if (!target) {
      return;
    }

    const className = button.attr("class") ?? "";
    const title = button.attr("aria-label") ?? button.text().trim();
    const link = $("<a></a>")
      .attr("href", target)
      .attr("class", className)
      .attr("aria-label", title)
      .text(button.text().trim());

    button.replaceWith(link);
  });

  root.find('nav[aria-label="Site"] [data-testid="linkElement"][role="button"]').each((_, element) => {
    const node = $(element);
    const label = node.text().replace(/\s+/g, " ").trim().toLowerCase();
    const target = headerMenuTargets[label];
    if (!target) {
      return;
    }

    const className = node.attr("class") ?? "";
    const replacement = $("<a></a>")
      .attr("data-testid", "linkElement")
      .attr("class", className)
      .attr("href", target)
      .html(node.html() ?? node.text());

    node.replaceWith(replacement);
  });

  return root.html() ?? "";
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

  const assetResolver = await loadAssetResolver();
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
    const renderHtml = rewriteInternalHtml(`${styleBundle}\n${cleanedBody}`, assetResolver);

    const text = (snapshot.text || "").replace(/\s+/g, " ").trim();
    const canonical = toLocalMirrorPath(snapshot.metadata?.canonical || pathValue);
    const ogImageRaw = snapshot.metadata?.ogImage || "";
    const ogImage = ogImageRaw ? assetResolver.resolveUrl(ogImageRaw) : "";

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
      links: dedupe((snapshot.links ?? []).map((value) => assetResolver.resolveUrl(value))),
      assets: dedupe((snapshot.assets ?? []).map((value) => assetResolver.resolveUrl(value))),
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
