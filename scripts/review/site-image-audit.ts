import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

type Finding = {
  src: string;
  alt: string;
  display: [number, number];
  natural: [number, number];
  ratioW: number;
  ratioH: number;
};

type CoverFinding = {
  src: string;
  alt: string;
  display: [number, number];
  natural: [number, number];
  objectFit: string;
};

type RouteResult = {
  route: string;
  url: string;
  status: number | null;
  ok: boolean;
  lowresFindings: Finding[];
  coverFindings: CoverFinding[];
  error: string | null;
};

const PROJECT_ROOT = process.cwd();
const BASE_URL = process.env.SITE_AUDIT_BASE_URL ?? "http://127.0.0.1:3000";
const ROUTES_FILE =
  process.env.SITE_AUDIT_ROUTES_FILE ??
  path.join(PROJECT_ROOT, "mekorhabracha_public_urls_2026-02-28_playwright_clean_reachable.txt");
const OUT_FILE =
  process.env.SITE_AUDIT_OUT_FILE ??
  path.join(PROJECT_ROOT, "output/review/site-image-audit-latest.json");
const CONCURRENCY = Number(process.env.SITE_AUDIT_CONCURRENCY ?? "6");
const NAV_TIMEOUT = Number(process.env.SITE_AUDIT_TIMEOUT_MS ?? "30000");
const WAIT_UNTIL =
  (process.env.SITE_AUDIT_WAIT_UNTIL as "domcontentloaded" | "load" | "networkidle" | "commit" | undefined) ??
  "domcontentloaded";

function shouldSkipRoute(route: string): boolean {
  const lower = route.toLowerCase();
  if (lower.startsWith("/_files/")) return true;
  if (lower.startsWith("/api/")) return true;
  if (lower.startsWith("/_next/")) return true;
  if (["/favicon.ico", "/robots.txt", "/sitemap.xml", "/blog-feed.xml"].includes(lower)) return true;
  if (/\.(pdf|doc|docx|xls|xlsx|zip|png|jpe?g|gif|webp|svg|xml|txt)$/i.test(lower)) return true;
  return false;
}

function loadRoutes(): string[] {
  const raw = fs
    .readFileSync(ROUTES_FILE, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const routes: string[] = [];
  const seen = new Set<string>();
  for (const line of raw) {
    let parsed: URL;
    try {
      parsed = new URL(line);
    } catch {
      continue;
    }

    if (!/mekorhabracha\.org$/i.test(parsed.hostname)) {
      continue;
    }

    const route = `${decodeURIComponent(parsed.pathname)}${parsed.search || ""}` || "/";
    if (shouldSkipRoute(route)) {
      continue;
    }
    if (!seen.has(route)) {
      seen.add(route);
      routes.push(route);
    }
  }

  if (!seen.has("/")) {
    routes.unshift("/");
  }

  return routes;
}

async function main() {
  const routes = loadRoutes();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const results: RouteResult[] = new Array(routes.length);
  let index = 0;

  async function auditRoute(route: string): Promise<RouteResult> {
    const page = await context.newPage();
    const url = `${BASE_URL}${encodeURI(route)}`;
    try {
      const response = await page.goto(url, { waitUntil: WAIT_UNTIL, timeout: NAV_TIMEOUT });
      await page.waitForTimeout(500);

      const status = response?.status() ?? null;
      const findings = await page.evaluate(() => {
        const lowres = [];
        const cover = [];
        const imgs = Array.from(document.querySelectorAll("img"));

        for (const img of imgs) {
          const computed = window.getComputedStyle(img);
          const rect = img.getBoundingClientRect();
          const visible =
            computed.display !== "none" &&
            computed.visibility !== "hidden" &&
            Number(computed.opacity || "1") !== 0 &&
            rect.width >= 80 &&
            rect.height >= 60;

          if (!visible) continue;

          const src = img.currentSrc || img.src || "";
          const alt = img.getAttribute("alt") || "";
          const naturalW = img.naturalWidth || 0;
          const naturalH = img.naturalHeight || 0;
          const isBg = Boolean(
            img.closest(".bgImage, [class*='bgImage'], [data-bg], [data-background], [class*='background']"),
          );

          if (computed.objectFit === "cover" && !isBg) {
            cover.push({
              src,
              alt,
              objectFit: computed.objectFit,
              display: [Math.round(rect.width), Math.round(rect.height)],
              natural: [naturalW, naturalH],
            });
          }

          if (naturalW > 0 && naturalH > 0) {
            const lowW = naturalW < rect.width * 0.8;
            const lowH = naturalH < rect.height * 0.8;
            if (lowW || lowH) {
              lowres.push({
                src,
                alt,
                display: [Math.round(rect.width), Math.round(rect.height)],
                natural: [naturalW, naturalH],
                ratioW: Number((naturalW / rect.width).toFixed(2)),
                ratioH: Number((naturalH / rect.height).toFixed(2)),
              });
            }
          }
        }

        return { lowres, cover };
      });

      return {
        route,
        url,
        status,
        ok: status !== null && status < 500,
        lowresFindings: findings.lowres.map((item) => ({
          ...item,
          display: [item.display[0], item.display[1]] as [number, number],
          natural: [item.natural[0], item.natural[1]] as [number, number],
        })),
        coverFindings: findings.cover.map((item) => ({
          ...item,
          display: [item.display[0], item.display[1]] as [number, number],
          natural: [item.natural[0], item.natural[1]] as [number, number],
        })),
        error: null,
      };
    } catch (error) {
      return {
        route,
        url,
        status: null,
        ok: false,
        lowresFindings: [],
        coverFindings: [],
        error: String(error),
      };
    } finally {
      await page.close();
    }
  }

  async function worker() {
    while (index < routes.length) {
      const current = index++;
      const route = routes[current];
      const result = await auditRoute(route);
      results[current] = result;
      if (result.error) {
        console.log(`error ${route} ${result.error}`);
      } else {
        console.log(
          `checked ${route} status=${result.status} lowres=${result.lowresFindings.length} cover=${result.coverFindings.length}`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await browser.close();

  const output = {
    generatedAt: new Date().toISOString(),
    totalRoutes: routes.length,
    results,
  };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  const lowresRoutes = results.filter((r) => r.lowresFindings.length > 0).length;
  const coverRoutes = results.filter((r) => r.coverFindings.length > 0).length;
  const erroredRoutes = results.filter((r) => r.error).length;

  console.log(`wrote ${OUT_FILE}`);
  console.log(`routes=${routes.length} lowresRoutes=${lowresRoutes} coverRoutes=${coverRoutes} errors=${erroredRoutes}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
