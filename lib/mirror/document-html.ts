import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

import { sanitizeMirrorHtml } from "@/lib/mirror/html-security";

const WIX_EVENTS_MAP_HOST = "events.wixapps.net";
const WIX_EVENTS_MAP_PATH = "/events-server/html/google-map-v2";

const YOUTUBE_EMBED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const YOUTUBE_QUERY_PARAMS_TO_STRIP = [
  "enablejsapi",
  "widgetid",
  "forigin",
  "aoriginsup",
  "vf",
];

const SITE_HOSTS = new Set(["www.mekorhabracha.org", "mekorhabracha.org"]);

function toUrl(raw: string) {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function buildMapEmbedUrl(lat: string, lng: string) {
  const q = `${lat},${lng}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
}

function toRelativeMekorHref(rawHref: string) {
  if (rawHref.startsWith("https://www.mekorhabracha.org")) {
    return rawHref.replace("https://www.mekorhabracha.org", "");
  }

  if (rawHref.startsWith("https://mekorhabracha.org")) {
    return rawHref.replace("https://mekorhabracha.org", "");
  }

  if (rawHref.startsWith("http://www.mekorhabracha.org")) {
    return rawHref.replace("http://www.mekorhabracha.org", "");
  }

  if (rawHref.startsWith("http://mekorhabracha.org")) {
    return rawHref.replace("http://mekorhabracha.org", "");
  }

  return rawHref;
}

function normalizeInternalLinks($: CheerioAPI, root: Cheerio<AnyNode>) {
  root.find("a[href]").each((_, element) => {
    const anchor = $(element);
    const rawHref = anchor.attr("href")?.trim();

    if (!rawHref) {
      return;
    }

    const relativeHref = toRelativeMekorHref(rawHref);
    if (relativeHref !== rawHref) {
      anchor.attr("href", relativeHref);
    }

    if (relativeHref === "/kosher-posts") {
      anchor.attr("href", "/center-city");
    }
  });
}

function rewriteWixIframes($: CheerioAPI, root: Cheerio<AnyNode>) {
  root.find("iframe").each((_, node) => {
    const iframe = $(node);
    const src = iframe.attr("src");

    if (!src) {
      return;
    }

    const url = toUrl(src);
    if (!url) {
      return;
    }

    if (url.hostname === WIX_EVENTS_MAP_HOST && url.pathname === WIX_EVENTS_MAP_PATH) {
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");

      if (!lat || !lng) {
        iframe.remove();
        return;
      }

      iframe.attr("src", buildMapEmbedUrl(lat, lng));
      iframe.attr("loading", "lazy");
      iframe.attr("referrerpolicy", "no-referrer-when-downgrade");
      iframe.attr("data-mirror-replaced", "wix-events-map");

      if (!iframe.attr("title")) {
        iframe.attr("title", "Event location map");
      }

      return;
    }

    if (YOUTUBE_EMBED_HOSTS.has(url.hostname) && url.pathname.startsWith("/embed/")) {
      for (const key of YOUTUBE_QUERY_PARAMS_TO_STRIP) {
        url.searchParams.delete(key);
      }

      url.hostname = "www.youtube-nocookie.com";
      iframe.attr("src", url.toString());
      iframe.attr("loading", "lazy");
      iframe.attr("referrerpolicy", "strict-origin-when-cross-origin");

      if (!iframe.attr("title")) {
        iframe.attr("title", "Embedded video");
      }
    }
  });
}

function normalizeMainNavSubmenus($: CheerioAPI, root: Cheerio<AnyNode>) {
  root.find('nav[aria-label="Site"] li.mirror-native-has-submenu').each((_, node) => {
    const item = $(node);
    const trigger = item.children(".mirror-native-submenu-trigger").first();
    const toggle = item.children(".mirror-native-submenu-toggle, button._pfxlW").first();

    item.attr("data-open", "false");

    if (trigger.length > 0) {
      trigger.attr("aria-haspopup", "true");
      trigger.attr("aria-expanded", "false");

      if (trigger.is("a")) {
        trigger.attr("role", "button");
        if (!trigger.attr("tabindex")) {
          trigger.attr("tabindex", "0");
        }
        trigger.attr("data-mirror-submenu-trigger", "true");
      }
    }

    if (toggle.length > 0) {
      toggle.attr("type", "button");
      toggle.attr("aria-expanded", "false");
    }
  });
}

function optimizeMediaLoading($: CheerioAPI, root: Cheerio<AnyNode>) {
  let imageCount = 0;

  root.find("img").each((_, element) => {
    const image = $(element);

    if (!image.attr("decoding")) {
      image.attr("decoding", "async");
    }

    const hasExplicitLoading = Boolean(image.attr("loading"));
    const isHighPriority = image.attr("fetchpriority") === "high";

    if (!hasExplicitLoading && !isHighPriority && imageCount > 1) {
      image.attr("loading", "lazy");
    }

    imageCount += 1;
  });

  root.find("iframe").each((_, element) => {
    const iframe = $(element);

    if (!iframe.attr("loading")) {
      iframe.attr("loading", "lazy");
    }
  });
}

function rewriteAbsoluteMediaSources($: CheerioAPI, root: Cheerio<AnyNode>) {
  root.find("img[src],source[src],iframe[src]").each((_, element) => {
    const node = $(element);
    const source = node.attr("src");

    if (!source) {
      return;
    }

    const parsed = toUrl(source);
    if (!parsed || !SITE_HOSTS.has(parsed.hostname)) {
      return;
    }

    node.attr("src", `${parsed.pathname}${parsed.search}`);
  });
}

export function prepareMirrorDocumentHtml(rawHtml: string) {
  if (!rawHtml) {
    return "";
  }

  const secureHtml = sanitizeMirrorHtml(rawHtml);
  const $ = load(`<div id=\"__mirror_doc_root\">${secureHtml}</div>`);
  const root = $("#__mirror_doc_root");

  root.find("link[rel='preload'], link[rel='modulepreload']").remove();
  root.find("img[srcset*='wixstatic.com'], source[srcset*='wixstatic.com']").removeAttr("srcset");

  rewriteWixIframes($, root);
  normalizeInternalLinks($, root);
  rewriteAbsoluteMediaSources($, root);
  normalizeMainNavSubmenus($, root);
  optimizeMediaLoading($, root);

  return root.html() ?? "";
}
