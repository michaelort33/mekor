import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { load } from "cheerio";

const ARCHIVE_URL =
  "https://us2.campaign-archive.com/home/?u=f9fe87a16c42c24704c099073&id=94f3350887";
const OUTPUT_PATH = path.resolve("lib/newsletters/generated/archive.json");
const ASSET_DIR = path.resolve("public/newsletters/archive/assets");
const PUBLIC_ASSET_PREFIX = "/newsletters/archive/assets";
const USER_AGENT = "Mozilla/5.0 (compatible; MekorHabrachaArchiveImporter/1.0)";

const BLOCK_SELECTOR = [
  ".mcnImageBlock",
  ".mcnTextBlock",
  ".mcnCaptionBlock",
  ".mcnDividerBlock",
  ".mcnButtonBlock",
  ".mcnFollowBlock",
].join(",");

const CONTENT_SELECTOR = [
  ".mcnImageContent",
  ".mcnCaptionBottomImageContent",
  ".mcnCaptionLeftImageContent",
  ".mcnCaptionRightImageContent",
  ".mcnTextContent",
].join(",");

function normalizeWhitespace(value) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function collapseText(value) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ");
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 88);
}

function toIsoDate(value) {
  const [month, day, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

function classifyIssue(title) {
  if (/newsletter/i.test(title)) return "weekly";
  if (/eruv/i.test(title)) return "eruv";
  if (/class|learning|zionism/i.test(title)) return "classes";
  if (/dinner|wine|tasting|rsvp/i.test(title)) return "events";
  return "community";
}

function normalizeImageUrl(value) {
  if (!value) return null;
  const withProtocol = value.startsWith("//") ? `https:${value}` : value;
  if (withProtocol.startsWith("data:")) return null;
  const url = new URL(withProtocol);
  if (url.hostname === "ecp.yusercontent.com" && url.searchParams.get("url")) {
    return url.searchParams.get("url");
  }
  url.hash = "";
  return url.toString();
}

function extensionFor(contentType, sourceUrl) {
  const pathname = new URL(sourceUrl).pathname;
  const sourceExtension = path.extname(pathname).toLowerCase();
  if (/^\.(png|jpe?g|gif|webp|svg)$/.test(sourceExtension)) return sourceExtension;
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("svg")) return ".svg";
  return ".jpg";
}

function safeBasename(sourceUrl) {
  const basename = decodeURIComponent(path.basename(new URL(sourceUrl).pathname))
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return basename || "newsletter-image";
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return { html: await response.text(), finalUrl: response.url };
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

async function downloadAsset(sourceUrl) {
  const response = await fetch(sourceUrl, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Failed to download ${sourceUrl}: ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  const hash = createHash("sha1").update(sourceUrl).digest("hex").slice(0, 12);
  const originalBasename = safeBasename(sourceUrl).replace(/\.[a-zA-Z0-9]+$/, "");
  const filename = `${hash}-${originalBasename}${extensionFor(contentType, sourceUrl)}`;
  await writeFile(path.join(ASSET_DIR, filename), Buffer.from(await response.arrayBuffer()));
  return `${PUBLIC_ASSET_PREFIX}/${filename}`;
}

function elementAlignment($element) {
  const style = $element.attr("style") || "";
  const match = style.match(/text-align\s*:\s*(left|center|right|justify)/i);
  const value = ($element.attr("align") || match?.[1] || "").toLowerCase();
  return ["left", "center", "right", "justify"].includes(value) ? value : undefined;
}

function elementVariant($element) {
  const style = $element.attr("style") || "";
  const match = style.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i);
  if (!match) return undefined;
  const size = Number(match[1]);
  if (size >= 20) return "large";
  if (size <= 13) return "small";
  return undefined;
}

function textFromNode($, node) {
  return normalizeWhitespace($(node).text());
}

function rewriteHref(value, campaignPathByShortUrl) {
  if (!value || /^javascript:/i.test(value)) return undefined;
  if (campaignPathByShortUrl.has(value)) return campaignPathByShortUrl.get(value);
  if (/^https?:\/\/us2\.campaign-archive\.com\/home\//i.test(value)) return "/newsletters";
  if (/^(mailto:|tel:)/i.test(value)) return value;
  try {
    const url = new URL(value);
    if (/^(www\.)?mekorhabracha\.org$/i.test(url.hostname)) {
      return `${url.pathname}${url.search}${url.hash}` || "/";
    }
  } catch {
    return value;
  }
  return value;
}

function parseContentNode($, node, context) {
  if (node.type === "text") {
    const value = collapseText(node.data || "");
    const parentTag = node.parent?.tagName?.toLowerCase();
    if (!value.trim() && ["table", "tbody", "tr"].includes(parentTag)) return null;
    return value ? { type: "text", value } : null;
  }
  if (node.type !== "tag") return null;

  const $node = $(node);
  const tag = node.tagName.toLowerCase();
  if (["script", "style", "noscript"].includes(tag)) return null;

  if (tag === "img") {
    const sourceUrl = normalizeImageUrl($node.attr("src"));
    if (!sourceUrl) return null;
    const src = context.assetMap.get(sourceUrl);
    if (!src) throw new Error(`Missing local asset for ${sourceUrl}`);
    return {
      type: "image",
      src,
      alt: normalizeWhitespace($node.attr("alt") || "") || "Mekor Habracha newsletter image",
    };
  }

  if (tag === "br") return { type: "break" };

  const children = $node
    .contents()
    .toArray()
    .map((child) => parseContentNode($, child, context))
    .filter(Boolean);

  if (tag === "a") {
    const href = rewriteHref($node.attr("href"), context.campaignPathByShortUrl);
    return href ? { type: "link", href, children } : { type: "element", tag: "span", children };
  }

  const supportedTags = new Set([
    "div",
    "p",
    "span",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "ul",
    "ol",
    "li",
    "table",
    "tbody",
    "tr",
    "td",
    "h1",
    "h2",
    "h3",
    "font",
    "center",
  ]);
  if (!supportedTags.has(tag)) return { type: "element", tag: "span", children };

  const output = { type: "element", tag, children };
  const align = elementAlignment($node);
  const variant = elementVariant($node);
  if (align) output.align = align;
  if (variant) output.variant = variant;
  if (["h1", "h2", "h3"].includes(tag)) {
    const text = textFromNode($, node);
    if (text && !/^Want to change how you receive these emails\??$/i.test(text)) {
      const id = `section-${context.headingIndex + 1}-${slugify(text).slice(0, 48)}`;
      context.headingIndex += 1;
      context.toc.push({ id, label: text, level: Number(tag.slice(1)) });
      output.id = id;
    }
  }
  if (variant === "large" && !output.id) {
    const text = textFromNode($, node);
    const words = text.split(/\s+/).filter(Boolean);
    const looksLikeSection =
      text.length >= 3 &&
      text.length <= 86 &&
      words.length <= 13 &&
      !/^~+$/.test(text) &&
      !/^Parshat\b/i.test(text) &&
      !/^(Training will|Please email|Want to change how)/i.test(text) &&
      !/^\w+ \d{1,2}\s*-\s*\d{1,2},? \d{4}/i.test(text);
    if (looksLikeSection) {
      const id = `section-${context.headingIndex + 1}-${slugify(text).slice(0, 48)}`;
      context.headingIndex += 1;
      context.toc.push({ id, label: text, level: 2 });
      output.id = id;
    }
  }
  return output;
}

function parseContentUnit($, element, context) {
  const $element = $(element);
  if (!$element.hasClass("mcnTextContent")) {
    const image = $element.find("img[src]").first();
    if (!image.length) return null;
    const node = parseContentNode($, image.get(0), context);
    const href = rewriteHref($element.find("a[href]").first().attr("href"), context.campaignPathByShortUrl);
    return node ? { kind: "image", node, href } : null;
  }

  const nodes = $element
    .contents()
    .toArray()
    .map((node) => parseContentNode($, node, context))
    .filter(Boolean);
  return nodes.length ? { kind: "rich", nodes } : null;
}

function extractBlocks($, assetMap, campaignPathByShortUrl) {
  const context = { assetMap, campaignPathByShortUrl, toc: [], headingIndex: 0 };
  const blocks = [];
  $("#bodyTable")
    .find(BLOCK_SELECTOR)
    .filter((_, element) => !$(element).parents(BLOCK_SELECTOR).length)
    .each((_, element) => {
      const $element = $(element);
      if ($element.hasClass("mcnDividerBlock")) {
        blocks.push({ kind: "divider" });
        return;
      }
      if ($element.hasClass("mcnButtonBlock")) {
        const button = $element.find("a.mcnButton, a[href]").first();
        const label = normalizeWhitespace(button.text());
        const href = rewriteHref(button.attr("href"), campaignPathByShortUrl);
        if (label && href) blocks.push({ kind: "button", label, href });
        return;
      }
      if ($element.hasClass("mcnFollowBlock")) {
        const links = [];
        $element.find("a[href]").each((__, anchor) => {
          const $anchor = $(anchor);
          const label = normalizeWhitespace($anchor.find("img").attr("alt") || $anchor.text());
          const href = rewriteHref($anchor.attr("href"), campaignPathByShortUrl);
          if (label && href) links.push({ label, href });
        });
        if (links.length) blocks.push({ kind: "links", links });
        return;
      }

      $element
        .find(CONTENT_SELECTOR)
        .filter((__, unit) => !$(unit).parents(CONTENT_SELECTOR).length)
        .each((__, unit) => {
          const block = parseContentUnit($, unit, context);
          if (block) blocks.push(block);
        });
    });
  return { blocks, toc: context.toc };
}

async function main() {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await mkdir(ASSET_DIR, { recursive: true });
  const existingArchive = JSON.parse(await readFile(OUTPUT_PATH, "utf8").catch(() => '{"issues":[]}'));

  const { html: archiveHtml } = await fetchText(ARCHIVE_URL);
  const archive = load(archiveHtml);
  const issueLinks = [];
  archive("li.campaign").each((_, element) => {
    const anchor = archive(element).find("a[href]").first();
    const rowText = normalizeWhitespace(archive(element).text());
    issueLinks.push({
      archiveDate: rowText.slice(0, 10),
      title: normalizeWhitespace(anchor.text()),
      shortUrl: anchor.attr("href"),
    });
  });
  if (!issueLinks.length) throw new Error("Mailchimp archive returned no campaigns");

  const fetchedIssues = await mapLimit(issueLinks, 4, async (issue) => {
    const response = await fetchText(issue.shortUrl);
    return { ...issue, ...response };
  });

  const slugCounts = new Map();
  for (const issue of fetchedIssues) {
    issue.sentOn = toIsoDate(issue.archiveDate);
    const baseTitle = issue.title.replace(/^Mekor Habracha Newsletter\s*-\s*/i, "") || issue.title;
    const baseSlug = `${slugify(baseTitle)}-${issue.sentOn}`;
    const count = slugCounts.get(baseSlug) || 0;
    slugCounts.set(baseSlug, count + 1);
    issue.slug = count ? `${baseSlug}-${new URL(issue.finalUrl).searchParams.get("id")}` : baseSlug;
    issue.campaignId = new URL(issue.finalUrl).searchParams.get("id");
  }

  const campaignPathByShortUrl = new Map(
    fetchedIssues.map((issue) => [issue.shortUrl, `/newsletters/${issue.slug}`]),
  );
  const imageUrls = new Set();
  for (const issue of fetchedIssues) {
    const $ = load(issue.html);
    $("#bodyTable img[src]").each((_, image) => {
      const sourceUrl = normalizeImageUrl($(image).attr("src"));
      if (sourceUrl) imageUrls.add(sourceUrl);
    });
  }

  const sortedImageUrls = [...imageUrls].sort();
  const localAssets = await mapLimit(sortedImageUrls, 6, downloadAsset);
  const assetMap = new Map(sortedImageUrls.map((url, index) => [url, localAssets[index]]));

  const issues = fetchedIssues.map((issue) => {
    const $ = load(issue.html);
    const preheaderText = normalizeWhitespace($(".mcnPreviewText").first().text());
    const body = $("#bodyTable").clone();
    body.find("script,style,noscript,.mcnPreviewText").remove();
    const searchText = normalizeWhitespace(body.text());
    const upperText = normalizeWhitespace($("#templateUpperBody").text());
    const footerText = normalizeWhitespace($("#templateFooter").text());
    const previewSource = preheaderText || upperText || footerText || searchText;
    const preview = previewSource.length > 220 ? `${previewSource.slice(0, 217).trimEnd()}…` : previewSource;
    const { blocks, toc } = extractBlocks($, assetMap, campaignPathByShortUrl);
    const meaningfulImages = [];
    $("#bodyTable img[src]").each((_, image) => {
      const sourceUrl = normalizeImageUrl($(image).attr("src"));
      if (
        sourceUrl &&
        !sourceUrl.includes("75d082cb-45f0-420c-95dd-3f153937e7ef") &&
        !sourceUrl.includes("cdn-images.mailchimp.com/icons")
      ) {
        meaningfulImages.push(assetMap.get(sourceUrl));
      }
    });
    const words = searchText.split(/\s+/).filter(Boolean).length;
    return {
      slug: issue.slug,
      campaignId: issue.campaignId,
      title: issue.title,
      category: classifyIssue(issue.title),
      sentOn: issue.sentOn,
      preview,
      coverImage: meaningfulImages[0] || null,
      readingMinutes: Math.max(1, Math.ceil(words / 220)),
      searchText,
      toc,
      blocks,
    };
  });

  const mergedByCampaign = new Map((existingArchive.issues || []).map((issue) => [issue.campaignId, issue]));
  for (const issue of issues) mergedByCampaign.set(issue.campaignId, issue);
  const mergedIssues = [...mergedByCampaign.values()].sort((a, b) => b.sentOn.localeCompare(a.sentOn));
  const referencedAssets = new Set(
    (JSON.stringify(mergedIssues).match(/\/newsletters\/archive\/assets\/[^"]+/g) || []),
  );
  const output = {
    source: ARCHIVE_URL,
    importedAt: new Date().toISOString(),
    issueCount: mergedIssues.length,
    assetCount: referencedAssets.size,
    issues: mergedIssues,
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);

  const written = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  if (written.issueCount < issueLinks.length) {
    throw new Error(`Expected at least ${issueLinks.length} issues, wrote ${written.issueCount}`);
  }
  const externalImages = JSON.stringify(written).match(/https?:\\?\/\\?\/[^\" ]+\.(png|jpe?g|gif|webp)/gi) || [];
  if (externalImages.length) throw new Error(`Generated archive still contains external images: ${externalImages[0]}`);
  console.log(`Imported ${written.issueCount} issues and ${written.assetCount} local assets.`);
}

await main();
