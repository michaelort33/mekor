import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

import { sanitizeMirrorHtml } from "@/lib/mirror/html-security";
import { KOSHER_MAP_PATH, KOSHER_NEIGHBORHOOD_PATHS } from "@/lib/mirror/kosher-map";
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
const MAP_PAGE_CONTAINER_ID = "mekor-kosher-map-page-embed";
const LEGACY_MAP_IFRAME_FRAGMENT = "92f487_18faae6f3d17c0bfced150d83fa167cd.html";

const HOMEPAGE_MAP_IFRAME_SRC =
  "https://maps.google.com/maps?q=1500%20Walnut%20St%20Suite%20206%20Philadelphia%20PA&t=&z=15&ie=UTF8&iwloc=&output=embed";
const HOMEPAGE_DIRECTIONS_HREF =
  "https://www.google.com/maps/dir/?api=1&destination=1500+Walnut+St+Suite+206+Philadelphia+PA+19102";
const EVENTS_CALENDAR_EMBED_SRC =
  "https://calendar.google.com/calendar/embed?src=david%40mekorhabracha.org&ctz=America%2FNew_York";
const DONATION_HERO_BG_MEDIA_ID = "#bgMedia_comp-m5l2m4cv";

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

  const directions = $("<a></a>")
    .attr("href", HOMEPAGE_DIRECTIONS_HREF)
    .attr("target", "_blank")
    .attr("rel", "noreferrer noopener")
    .attr("class", "mirror-map-directions-link")
    .text("Directions");

  mapRoot.append(iframe, directions);
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

function applyKosherMapPageFallback(root: Cheerio<AnyNode>) {
  const legacyIframe = root.find(`iframe[src*="${LEGACY_MAP_IFRAME_FRAGMENT}"]`).first();

  if (legacyIframe.length === 0) {
    return;
  }

  const legacyContainer = legacyIframe.closest("div.RjABt4, div[id^='comp-']");
  const target = legacyContainer.length > 0 ? legacyContainer : legacyIframe.parent();

  if (target.length > 0) {
    target.attr("data-mekor-legacy-map", "hidden");
  }
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

  if (path === KOSHER_MAP_PATH) {
    applyKosherMapPageFallback(root);
    ensureMapContainer($, root, MAP_PAGE_CONTAINER_ID, true);
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
  rewriteAbsoluteMediaSources($, root);
  normalizeMainNavSubmenus($, root);
  applyPathSpecificFixes($, root, normalizePath(path));
  optimizeMediaLoading($, root);

  return root.html() ?? "";
}
