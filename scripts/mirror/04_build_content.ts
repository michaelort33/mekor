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
  bodyHtml: string;
  styleBundleId: string;
  capturedAt: string;
};

type StyleBundleRecord = {
  id: string;
  href: string;
  file: string;
  bytes: number;
  documentCount: number;
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

const PUBLIC_MIRROR_STYLES_DIR = path.join(process.cwd(), "public", "mirror-styles");

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

function getUgdId(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const match =
      url.pathname.match(/\/_files\/ugd\/([a-z0-9]+_[a-z0-9]+)/i) ??
      url.pathname.match(/\/ugd\/([a-z0-9]+_[a-z0-9]+)/i);
    return (match?.[1] ?? "").toLowerCase();
  } catch {
    const match = rawUrl.match(/\/_files\/ugd\/([a-z0-9]+_[a-z0-9]+)/i) ?? rawUrl.match(/\/ugd\/([a-z0-9]+_[a-z0-9]+)/i);
    return (match?.[1] ?? "").toLowerCase();
  }
}

function getFileBasename(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return decodeURIComponent(path.basename(url.pathname || "")).trim();
  } catch {
    return decodeURIComponent(path.basename(rawUrl || "")).trim();
  }
}

function fileToken(input: string) {
  return input
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\(\d+\)/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function looksLikeFileUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, "https://www.mekorhabracha.org");
    const pathname = url.pathname.toLowerCase();
    return (
      /\.(pdf|doc|docx|jpg|jpeg|png|gif|webp|svg|avif|xml|txt|csv)$/i.test(pathname) ||
      pathname.includes("/_files/ugd/") ||
      pathname.includes("/uploads/") ||
      pathname.includes("/ugd/")
    );
  } catch {
    return /\.(pdf|doc|docx|jpg|jpeg|png|gif|webp|svg|avif|xml|txt|csv)$/i.test(rawUrl);
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
  const byUgdId = new Map<string, string>();
  const byFileToken = new Map<string, string>();

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

    const ugdFromSource = getUgdId(source);
    if (ugdFromSource && !byUgdId.has(ugdFromSource)) {
      byUgdId.set(ugdFromSource, row.blobUrl);
    }

    const ugdFromPath = getUgdId(rowPath);
    if (ugdFromPath && !byUgdId.has(ugdFromPath)) {
      byUgdId.set(ugdFromPath, row.blobUrl);
    }

    const sourceBase = getFileBasename(source);
    const sourceToken = fileToken(sourceBase);
    if (sourceToken && !byFileToken.has(sourceToken)) {
      byFileToken.set(sourceToken, row.blobUrl);
    }

    const blobBase = getFileBasename(row.blobKey ?? "");
    const blobToken = fileToken(blobBase);
    if (blobToken && !byFileToken.has(blobToken)) {
      byFileToken.set(blobToken, row.blobUrl);
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

    const ugdId = getUgdId(raw);
    if (ugdId) {
      const ugdHit = byUgdId.get(ugdId);
      if (ugdHit) {
        return ugdHit;
      }
    }

    if (looksLikeFileUrl(raw)) {
      const token = fileToken(getFileBasename(raw));
      const tokenHit = byFileToken.get(token);
      if (tokenHit) {
        return tokenHit;
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

function extractStylesheetHref(value: string) {
  const raw = decodeHtmlAmpersands((value ?? "").trim());
  if (!raw) {
    return "";
  }

  if (raw.startsWith("<")) {
    const $ = loadHtml(raw);
    return $("link").attr("href")?.trim() ?? "";
  }

  return raw;
}

function extractStyleCss(value: string) {
  const raw = (value ?? "").trim();
  if (!raw) {
    return "";
  }

  if (raw.startsWith("<")) {
    const $ = loadHtml(raw);
    return $("style").html()?.trim() ?? "";
  }

  return raw;
}

function normalizeStyleBundleCss(cssParts: string[]) {
  return cssParts
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function buildStyleBundleCss(snapshot: SnapshotRecord, resolver: AssetResolver) {
  const cssParts: string[] = [];

  for (const styleLink of snapshot.styleLinks ?? []) {
    const href = extractStylesheetHref(styleLink);
    if (!href) {
      continue;
    }

    const rewritten = resolver.resolveUrl(href).replace(/"/g, '\\"');
    cssParts.push(`@import url("${rewritten}");`);
  }

  for (const styleTag of snapshot.styleTags ?? []) {
    const css = extractStyleCss(styleTag);
    if (!css) {
      continue;
    }

    cssParts.push(rewriteStyleUrls(css, resolver.resolveUrl));
  }

  return normalizeStyleBundleCss(cssParts);
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

  root.find('nav[aria-label="Site"] li').each((_, li) => {
    const listItem = $(li);
    const submenu = listItem.children("ul").first();

    if (submenu.length === 0) {
      return;
    }

    listItem.addClass("mirror-native-has-submenu");
    submenu.addClass("mirror-native-submenu");
    submenu.removeAttr("style");
    submenu.removeAttr("aria-hidden");

    const trigger = listItem.children("a, button, [role='button']").first();
    if (trigger.length > 0) {
      trigger.addClass("mirror-native-submenu-trigger");
    }

    const toggle = listItem.children("button").last();
    if (toggle.length > 0) {
      toggle.attr("type", "button");
      toggle.attr("aria-expanded", "false");
      toggle.addClass("mirror-native-submenu-toggle");
    }

    submenu.find("a").each((__, link) => {
      const href = $(link).attr("href");
      if (!href) {
        return;
      }
      $(link).attr("href", resolver.resolveUrl(href));
    });
  });

  return root.html() ?? "";
}

function rebalanceEventPortraitImages(html: string) {
  const $ = loadHtml(`<div id="__event_root">${html}</div>`);
  const root = $("#__event_root");

  root.find("div[data-source-width][data-source-height]").each((_, element) => {
    const node = $(element);
    const width = Number.parseInt(node.attr("data-source-width") ?? "", 10);
    const height = Number.parseInt(node.attr("data-source-height") ?? "", 10);

    if (!Number.isFinite(width) || !Number.isFinite(height) || height <= width) {
      return;
    }

    const image = node.find("img").first();
    if (image.length === 0) {
      return;
    }

    const className = node.attr("class") ?? "";
    if (!className.includes("resize-5-cover")) {
      return;
    }

    image.attr("style", "width:100%;height:100%;object-fit:contain;object-position:50% 50%;");
    node.attr("data-resize", "contain");
    node.addClass("mirror-event-portrait-fit");
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
  const styleBundleById = new Map<string, StyleBundleRecord & { css: string }>();

  await fs.rm(PUBLIC_MIRROR_STYLES_DIR, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_MIRROR_STYLES_DIR, { recursive: true });

  for (const snapshot of snapshots) {
    if (snapshot.status < 200 || snapshot.status >= 400) {
      continue;
    }

    const pathValue = snapshot.finalPath || snapshot.path;
    const type = classifyDocumentType(pathValue);
    const slug = slugFromPath(pathValue);

    const cleanedBody = removeNoiseFromBody(snapshot.bodyHtml || "");
    const rewrittenBody = rewriteInternalHtml(cleanedBody, assetResolver);
    const bodyHtml = type === "event" ? rebalanceEventPortraitImages(rewrittenBody) : rewrittenBody;
    const styleBundleCss = buildStyleBundleCss(snapshot, assetResolver);
    const styleBundleId = styleBundleCss ? hashSha1(styleBundleCss).slice(0, 16) : "";

    if (styleBundleCss) {
      let bundle = styleBundleById.get(styleBundleId);

      if (!bundle) {
        const fileName = `${styleBundleId}.css`;
        const href = `/mirror-styles/${fileName}`;
        const cssWithNewline = `${styleBundleCss}\n`;
        await fs.writeFile(path.join(PUBLIC_MIRROR_STYLES_DIR, fileName), cssWithNewline, "utf8");

        bundle = {
          id: styleBundleId,
          href,
          file: `mirror-styles/${fileName}`,
          bytes: Buffer.byteLength(cssWithNewline, "utf8"),
          documentCount: 0,
          css: styleBundleCss,
        };
        styleBundleById.set(styleBundleId, bundle);
      }

      bundle.documentCount += 1;
    }

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
      bodyHtml,
      styleBundleId,
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
  const styleBundles = [...styleBundleById.values()]
    .map((bundle) => ({
      id: bundle.id,
      href: bundle.href,
      file: bundle.file,
      bytes: bundle.bytes,
      documentCount: bundle.documentCount,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

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
    writeJson(path.join(CONTENT_DIR, "style-bundles.json"), styleBundles),
    writeJson(path.join(SEO_DIR, "metadata-by-path.json"), metadataByPath),
    writeJson(path.join(CONTENT_DIR, "content-summary.json"), {
      generatedAt: new Date().toISOString(),
      documentCount: docs.length,
      styleBundleCount: styleBundles.length,
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
