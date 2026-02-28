import { load } from "cheerio";

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

export function sanitizeMirrorHtml(rawHtml: string) {
  if (!rawHtml) {
    return "";
  }

  const $ = load(rawHtml);

  $("link[rel='preload'], link[rel='modulepreload']").remove();
  $("img[srcset*='wixstatic.com'], source[srcset*='wixstatic.com']").removeAttr("srcset");

  $("iframe").each((_, node) => {
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

  return $("body").html() ?? "";
}
