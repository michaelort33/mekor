import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

import { sanitizeMirrorHtml } from "@/lib/mirror/html-security";
import { KOSHER_NEIGHBORHOOD_PATHS } from "@/lib/mirror/kosher-map";
import { normalizePath } from "@/lib/mirror/url";

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

const ELFSIGHT_APP_CLASS = "elfsight-app-94318b42-b410-4983-8c4e-1eae94a93212";
const MAP_CONTAINER_ID = "mekor-kosher-map-embed";

const HOMEPAGE_MAP_IFRAME_SRC =
  "https://maps.google.com/maps?q=1500%20Walnut%20St%20Suite%20206%20Philadelphia%20PA&t=&z=15&ie=UTF8&iwloc=&output=embed";
const HOMEPAGE_DIRECTIONS_HREF =
  "https://www.google.com/maps/dir/?api=1&destination=1500+Walnut+St+Suite+206+Philadelphia+PA+19102";
const EVENTS_CALENDAR_EMBED_SRC =
  "https://calendar.google.com/calendar/embed?src=david%40mekorhabracha.org&ctz=America%2FNew_York";
const DONATION_HERO_BG_MEDIA_ID = "#bgMedia_comp-m5l2m4cv";

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildDeferredYouTubeSrcdoc(playbackUrl: string, thumbnailUrl: string, title: string) {
  const safePlaybackUrl = escapeHtmlAttribute(playbackUrl);
  const safeThumbnailUrl = escapeHtmlAttribute(thumbnailUrl);
  const safeTitle = escapeHtmlAttribute(title);

  return [
    "<style>",
    "*{margin:0;padding:0;overflow:hidden}",
    "html,body{height:100%}",
    "body{background:#0f1118;font-family:Arial,sans-serif}",
    "a{position:relative;display:block;width:100%;height:100%;color:inherit;text-decoration:none}",
    "img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}",
    "span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:76px;height:52px;border-radius:12px;background:rgba(0,0,0,0.72);color:#fff;font:700 34px/52px Arial,sans-serif;text-align:center}",
    "p{position:absolute;left:12px;right:12px;bottom:12px;margin:0;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,0.56);color:#fff;font:600 14px/1.25 Arial,sans-serif}",
    "</style>",
    `<a href="${safePlaybackUrl}" aria-label="Load video: ${safeTitle}">`,
    `<img src="${safeThumbnailUrl}" alt="">`,
    "<span>&#9658;</span>",
    "<p>Tap to load video</p>",
    "</a>",
  ].join("");
}

function buildDeferredMapSrcdoc(mapUrl: string, title: string) {
  const safeMapUrl = escapeHtmlAttribute(mapUrl);
  const safeTitle = escapeHtmlAttribute(title);

  return [
    "<style>",
    "*{margin:0;padding:0;overflow:hidden;box-sizing:border-box}",
    "html,body{height:100%}",
    "body{display:flex;align-items:center;justify-content:center;background:linear-gradient(140deg,#e9eff6 0%,#f5f7fb 52%,#dde7f3 100%);font-family:Arial,sans-serif;color:#1f3550}",
    "a{display:inline-flex;align-items:center;justify-content:center;min-width:220px;padding:12px 18px;border-radius:999px;border:1px solid #2a5f93;background:#2f6ea6;color:#fff;font:700 14px/1 Arial,sans-serif;letter-spacing:.02em;text-decoration:none}",
    "a:hover{background:#275d8d}",
    "p{position:absolute;top:18px;left:18px;right:18px;margin:0;text-align:center;font:600 13px/1.35 Arial,sans-serif;color:#3a4e66}",
    "</style>",
    `<p>${safeTitle}</p>`,
    `<a href="${safeMapUrl}" aria-label="Load interactive map">Load interactive map</a>`,
  ].join("");
}

function isGoogleMapEmbed(url: URL) {
  if (url.hostname === "maps.google.com") {
    return url.pathname.startsWith("/maps");
  }

  if (url.hostname === "www.google.com") {
    return url.pathname.startsWith("/maps");
  }

  return false;
}

function applyDeferredMapEmbed(iframe: Cheerio<AnyNode>, mapSrc: string) {
  const title = iframe.attr("title") ?? "Mekor Habracha Synagogue Map";
  iframe.attr("title", title);
  iframe.attr("data-mekor-deferred-embed", "map");
  iframe.attr("srcdoc", buildDeferredMapSrcdoc(mapSrc, title));
  iframe.attr("src", "about:blank");
  iframe.attr("loading", "lazy");
  iframe.attr("referrerpolicy", "no-referrer-when-downgrade");
}

function applyDeferredYouTubeEmbed(iframe: Cheerio<AnyNode>, embedUrl: URL) {
  const segments = embedUrl.pathname.split("/").filter(Boolean);
  const videoId = segments.at(-1);
  if (!videoId) {
    iframe.attr("src", embedUrl.toString());
    return;
  }

  const playbackUrl = new URL(embedUrl.toString());
  playbackUrl.searchParams.set("autoplay", "1");
  playbackUrl.searchParams.set("playsinline", "1");
  const thumbnailUrl = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
  const title = iframe.attr("title") ?? "Embedded video";

  iframe.attr("title", title);
  iframe.attr("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
  iframe.attr("data-mekor-deferred-embed", "youtube");
  iframe.attr("srcdoc", buildDeferredYouTubeSrcdoc(playbackUrl.toString(), thumbnailUrl, title));
  iframe.attr("src", "about:blank");
  iframe.attr("loading", "lazy");
  iframe.attr("referrerpolicy", "strict-origin-when-cross-origin");
}

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

function normalizeEventLinks($: CheerioAPI, root: Cheerio<AnyNode>, path: string) {
  if (!path.startsWith("/events-1/")) {
    return;
  }

  root.find('a[data-hook="RSVP_INFO_BUTTON"], a[href]').each((_, element) => {
    const anchor = $(element);
    const text = anchor.text().replace(/\s+/g, " ").trim().toLowerCase();
    if (!text.includes("see other events")) {
      return;
    }

    anchor.attr("href", "/events");
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

      const mapSrc = buildMapEmbedUrl(lat, lng);
      iframe.attr("src", mapSrc);
      iframe.attr("data-mirror-replaced", "wix-events-map");

      if (!iframe.attr("title")) {
        iframe.attr("title", "Event location map");
      }

      applyDeferredMapEmbed(iframe, mapSrc);

      return;
    }

    if (YOUTUBE_EMBED_HOSTS.has(url.hostname) && url.pathname.startsWith("/embed/")) {
      for (const key of YOUTUBE_QUERY_PARAMS_TO_STRIP) {
        url.searchParams.delete(key);
      }

      url.hostname = "www.youtube-nocookie.com";

      if (!iframe.attr("title")) {
        iframe.attr("title", "Embedded video");
      }

      applyDeferredYouTubeEmbed(iframe, url);
      return;
    }

    if (isGoogleMapEmbed(url)) {
      applyDeferredMapEmbed(iframe, url.toString());
    }
  });
}

function ensureHomepageMapEmbed($: CheerioAPI, root: Cheerio<AnyNode>) {
  const mapRoot = root.find("#comp-m5vlffw5").first();
  if (mapRoot.length === 0 || mapRoot.find("iframe").length > 0) {
    return;
  }

  const iframe = $("<iframe></iframe>")
    .attr("title", "Mekor Habracha Synagogue Map")
    .attr("loading", "lazy")
    .attr("referrerpolicy", "no-referrer-when-downgrade")
    .attr("src", HOMEPAGE_MAP_IFRAME_SRC)
    .attr("allowfullscreen", "");

  applyDeferredMapEmbed(iframe, HOMEPAGE_MAP_IFRAME_SRC);

  const directions = $("<a></a>")
    .attr("href", HOMEPAGE_DIRECTIONS_HREF)
    .attr("target", "_blank")
    .attr("rel", "noreferrer noopener")
    .attr("class", "mirror-map-directions-link")
    .text("Directions");

  mapRoot.append(iframe, directions);
}

function normalizeVisitAndContactMapEmbeds($: CheerioAPI, root: Cheerio<AnyNode>, path: string) {
  if (path !== "/visit-us" && path !== "/contact-us") {
    return;
  }

  root.find(".wixui-google-map iframe[src]").each((_, node) => {
    const iframe = $(node);
    const src = iframe.attr("src") ?? "";

    if (!src.includes("/media/googleMap.")) {
      return;
    }

    iframe.attr("src", HOMEPAGE_MAP_IFRAME_SRC);
    iframe.attr("data-mirror-replaced", "wix-static-google-map");

    if (!iframe.attr("title")) {
      iframe.attr("title", "Mekor Habracha Synagogue Map");
    }

    applyDeferredMapEmbed(iframe, HOMEPAGE_MAP_IFRAME_SRC);
  });
}

function ensureEventsCalendarEmbed(root: Cheerio<AnyNode>) {
  const calendarFrame = root.find("#comp-lvvd3qr7 iframe").first();
  if (calendarFrame.length > 0 && !calendarFrame.attr("src")) {
    calendarFrame.attr("src", EVENTS_CALENDAR_EMBED_SRC);
  }

  const wedge = root.find('[data-mesh-id="comp-m5ss52xcinlineContent-wedge-5"]').first();
  if (wedge.length > 0) {
    wedge.attr("data-mekor-hidden-wedge", "true");
  }
}

function ensureDonationHeroMedia($: CheerioAPI, root: Cheerio<AnyNode>) {
  const heroMedia = root.find(DONATION_HERO_BG_MEDIA_ID).first();
  if (heroMedia.length === 0 || heroMedia.children().length > 0) {
    return;
  }

  const fallbackSource = root
    .find("img[src]")
    .toArray()
    .map((node) => $(node))
    .map((image) => {
      const width = Number(image.attr("width") ?? "0");
      const height = Number(image.attr("height") ?? "0");
      return {
        src: image.attr("src"),
        width,
        height,
      };
    })
    .find((candidate) => candidate.src && candidate.width >= 900 && candidate.height >= 500);

  if (!fallbackSource?.src) {
    return;
  }

  const fallbackImage = $("<img />")
    .attr("src", fallbackSource.src)
    .attr("alt", "")
    .attr("decoding", "async")
    .attr("fetchpriority", "high")
    .attr(
      "style",
      "width:100%;height:100%;object-fit:cover;object-position:50% 50%;display:block;",
    );

  heroMedia.append(fallbackImage);
}

function prioritizeDonationPaymentIframe($: CheerioAPI, root: Cheerio<AnyNode>) {
  root.find("iframe[src]").each((_, node) => {
    const iframe = $(node);
    const src = iframe.attr("src") ?? "";

    if (!src.includes(".filesusr.com/html/")) {
      return;
    }

    iframe.attr("loading", "eager");
    iframe.attr("fetchpriority", "high");

    if (!iframe.attr("title")) {
      iframe.attr("title", "Donation payment form");
    }
  });
}

function findKosherMapHeading($: CheerioAPI, root: Cheerio<AnyNode>) {
  return root
    .find("h1,h2,h3,h4,h5,h6")
    .filter((_, heading) => $(heading).text().trim().toLowerCase() === "kosher map")
    .first();
}

function ensureMapContainer(
  $: CheerioAPI,
  root: Cheerio<AnyNode>,
  containerId: string,
  markMapPage: boolean,
) {
  const existing =
    root.find(`#${containerId}`).first().get(0) ??
    root.find(`.${ELFSIGHT_APP_CLASS}[data-mekor-kosher-map=\"true\"]`).first().get(0);

  if (existing) {
    if (markMapPage) {
      $(existing).attr("data-mekor-map-page", "true");
    }
    return;
  }

  const mapHeading = findKosherMapHeading($, root);
  if (mapHeading.length === 0) {
    return;
  }

  const anchor = mapHeading.closest("div.wixui-rich-text");
  const insertionTarget = anchor.length > 0 ? anchor : mapHeading;

  const mapContainer = $("<div></div>")
    .attr("id", containerId)
    .attr("class", ELFSIGHT_APP_CLASS)
    .attr("data-elfsight-app-lazy", "")
    .attr("data-mekor-kosher-map", "true");

  if (markMapPage) {
    mapContainer.attr("data-mekor-map-page", "true");
  }

  insertionTarget.after(mapContainer);
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

function applyPathSpecificFixes($: CheerioAPI, root: Cheerio<AnyNode>, path: string) {
  normalizeVisitAndContactMapEmbeds($, root, path);

  if (path === "/") {
    ensureHomepageMapEmbed($, root);
    return;
  }

  if (path === "/events") {
    ensureEventsCalendarEmbed(root);
    return;
  }

  if (path === "/donations") {
    ensureDonationHeroMedia($, root);
    prioritizeDonationPaymentIframe($, root);
    return;
  }

  if (KOSHER_NEIGHBORHOOD_PATHS.has(path)) {
    ensureMapContainer($, root, MAP_CONTAINER_ID, false);
  }
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

export function prepareMirrorDocumentHtml(rawHtml: string, path: string) {
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
  normalizeEventLinks($, root, normalizePath(path));
  rewriteAbsoluteMediaSources($, root);
  normalizeMainNavSubmenus($, root);
  applyPathSpecificFixes($, root, normalizePath(path));
  optimizeMediaLoading($, root);

  return root.html() ?? "";
}
