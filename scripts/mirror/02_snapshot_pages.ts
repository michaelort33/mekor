import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import {
  ensureMirrorDirs,
  hashSha1,
  parseSiteUrl,
  slugFromPath,
  toAbsoluteUrl,
  writeJson,
  ROUTES_DIR,
  SNAPSHOT_DIR,
} from "./_shared";

type RouteRecord = {
  path: string;
  sourceUrl: string;
};

type SnapshotRecord = {
  path: string;
  url: string;
  finalPath: string;
  finalUrl: string;
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
  outboundLinks: string[];
  assets: string[];
  styleTags: string[];
  styleLinks: string[];
  bodyHtml: string;
  text: string;
  textHash: string;
  capturedAt: string;
  source: string;
};

async function loadHtmlRoutes() {
  const raw = JSON.parse(
    await fs.readFile(path.join(ROUTES_DIR, "html-200.json"), "utf8"),
  ) as RouteRecord[];

  return raw;
}

async function loadOnlyPaths() {
  const inlineOnly = (process.env.MIRROR_SNAPSHOT_ONLY ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const onlyFile = process.env.MIRROR_SNAPSHOT_ONLY_FILE?.trim();

  if (!onlyFile) {
    return new Set(inlineOnly);
  }

  try {
    const content = await fs.readFile(onlyFile, "utf8");
    for (const line of content.split(/\r?\n/g)) {
      const value = line.trim();
      if (value) {
        inlineOnly.push(value);
      }
    }
  } catch {
    // ignore missing optional file
  }

  return new Set(inlineOnly);
}

async function main() {
  await ensureMirrorDirs();

  const htmlRoutes = await loadHtmlRoutes();
  const onlyPaths = await loadOnlyPaths();
  const limitRaw = process.env.MIRROR_SNAPSHOT_LIMIT;
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : Number.MAX_SAFE_INTEGER;
  const filteredRoutes =
    onlyPaths.size === 0 ? htmlRoutes : htmlRoutes.filter((route) => onlyPaths.has(route.path));
  const targetRoutes = filteredRoutes.slice(0, Number.isFinite(limit) ? limit : Number.MAX_SAFE_INTEGER);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: "Mozilla/5.0 (compatible; MekorMirrorSnapshot/1.0)",
  });
  const page = await context.newPage();

  let okCount = 0;
  let errorCount = 0;
  const failedPaths: string[] = [];

  for (let i = 0; i < targetRoutes.length; i += 1) {
    const route = targetRoutes[i];
    const targetUrl = toAbsoluteUrl(route.path);

    try {
      let response = null;
      try {
        response = await page.goto(targetUrl, {
          waitUntil: "load",
          timeout: 45_000,
        });
      } catch (primaryError) {
        response = await page.goto(targetUrl, {
          waitUntil: "domcontentloaded",
          timeout: 20_000,
        });
        console.warn(`snapshot fallback(domcontentloaded) for ${route.path}: ${String(primaryError)}`);
      }
      try {
        await page.waitForLoadState("networkidle", { timeout: 8_000 });
      } catch {
        // continue with captured DOM if network remains active
      }
      await page.waitForTimeout(900);

      const currentUrl = page.url();
      const finalPath = parseSiteUrl(currentUrl) ?? route.path;

      const details = (await page.evaluate(`(() => {
        const absolute = (input) => {
          if (!input) return "";
          try {
            return new URL(input, window.location.href).toString();
          } catch {
            return "";
          }
        };

        const getMeta = (selector) =>
          document.querySelector(selector)?.getAttribute("content")?.trim() ?? "";

        const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
          .map((element) => element.textContent?.trim() ?? "")
          .filter(Boolean)
          .slice(0, 120);

        const links = Array.from(document.querySelectorAll("a[href]"))
          .map((element) => absolute(element.getAttribute("href")))
          .filter(Boolean);

        const assets = Array.from(
          document.querySelectorAll(
            "img[src],source[src],video[src],audio[src],iframe[src],link[href],a[href]",
          ),
        )
          .map((element) => {
            const src = element.getAttribute("src") ?? element.getAttribute("href");
            return absolute(src);
          })
          .filter(Boolean);

        const styleTags = Array.from(document.querySelectorAll("head style"))
          .map((element) => element.outerHTML)
          .filter(Boolean);

        const styleLinks = Array.from(document.querySelectorAll('head link[rel="stylesheet"]'))
          .map((element) => element.outerHTML)
          .filter(Boolean);

        return {
          title: document.title?.trim() ?? "",
          metadata: {
            description: getMeta('meta[name="description"]'),
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() ?? "",
            ogTitle: getMeta('meta[property="og:title"]'),
            ogDescription: getMeta('meta[property="og:description"]'),
            ogImage: getMeta('meta[property="og:image"]'),
            twitterCard: getMeta('meta[name="twitter:card"]'),
            twitterTitle: getMeta('meta[name="twitter:title"]'),
            twitterDescription: getMeta('meta[name="twitter:description"]'),
          },
          headings,
          links,
          assets,
          styleTags,
          styleLinks,
          bodyHtml: document.body?.innerHTML ?? "",
          text: document.body?.innerText ?? "",
        };
      })()`)) as {
        title: string;
        metadata: SnapshotRecord["metadata"];
        headings: string[];
        links: string[];
        assets: string[];
        styleTags: string[];
        styleLinks: string[];
        bodyHtml: string;
        text: string;
      };

      const outboundLinks = details.links.filter((link) => {
        try {
          const parsed = new URL(link);
          return !parsed.hostname.endsWith("mekorhabracha.org");
        } catch {
          return false;
        }
      });

      const text = details.text.replace(/\s+/g, " ").trim();

      const snapshot: SnapshotRecord = {
        path: route.path,
        url: targetUrl,
        finalPath,
        finalUrl: currentUrl,
        status: response?.status() ?? 0,
        title: details.title,
        metadata: details.metadata,
        headings: [...new Set(details.headings)],
        links: [...new Set(details.links)],
        outboundLinks: [...new Set(outboundLinks)],
        assets: [...new Set(details.assets)],
        styleTags: details.styleTags,
        styleLinks: details.styleLinks,
        bodyHtml: details.bodyHtml,
        text,
        textHash: hashSha1(text),
        capturedAt: new Date().toISOString(),
        source: "playwright",
      };

      const filename = `${slugFromPath(route.path)}--${hashSha1(route.path).slice(0, 12)}.json`;
      await writeJson(path.join(SNAPSHOT_DIR, filename), snapshot);

      okCount += 1;
      if ((i + 1) % 10 === 0 || i + 1 === targetRoutes.length) {
        console.log(`snapshotted ${i + 1}/${targetRoutes.length}`);
      }
    } catch (error) {
      errorCount += 1;
      failedPaths.push(route.path);
      console.warn(`snapshot failed for ${route.path}: ${String(error)}`);
    }
  }

  await browser.close();

  await writeJson(path.join(ROUTES_DIR, "snapshot-summary.json"), {
    generatedAt: new Date().toISOString(),
    requestedCount: targetRoutes.length,
    okCount,
    errorCount,
    failedPaths,
  });

  console.log(`snapshot_ok=${okCount}`);
  console.log(`snapshot_errors=${errorCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
