import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

type PageIssue = {
  code:
    | "http_error"
    | "slow_dcl"
    | "slow_load"
    | "missing_h1"
    | "missing_cta"
    | "placeholder_copy"
    | "broken_images"
    | "low_res_images"
    | "missing_alt"
    | "failed_requests"
    | "console_errors";
  message: string;
  severity: "high" | "medium" | "low";
};

type RouteAudit = {
  route: string;
  status: number | null;
  dclMs: number | null;
  loadMs: number | null;
  h1Count: number;
  ctaCount: number;
  placeholderHits: string[];
  imageCount: number;
  brokenImages: number;
  lowResImages: number;
  missingAltImages: number;
  failedRequests: number;
  consoleErrors: number;
  issues: PageIssue[];
  error: string | null;
};

const PROJECT_ROOT = process.cwd();
const BASE_URL = process.env.SITE_QUALITY_AUDIT_BASE_URL ?? "http://127.0.0.1:3000";
const ROUTES_FILE =
  process.env.SITE_QUALITY_AUDIT_ROUTES_FILE ??
  path.join(PROJECT_ROOT, "mekorhabracha_public_urls_2026-02-28_playwright_clean_reachable.txt");
const OUT_JSON =
  process.env.SITE_QUALITY_AUDIT_OUT_JSON ??
  path.join(PROJECT_ROOT, "output/review/site-quality-audit-latest.json");
const OUT_MD =
  process.env.SITE_QUALITY_AUDIT_OUT_MD ??
  path.join(PROJECT_ROOT, "output/review/site-quality-audit-latest.md");
const CONCURRENCY = Number(process.env.SITE_QUALITY_AUDIT_CONCURRENCY ?? "5");
const NAV_TIMEOUT = Number(process.env.SITE_QUALITY_AUDIT_TIMEOUT_MS ?? "35000");

const ACTION_WORDS = [
  "join",
  "donate",
  "support",
  "sponsor",
  "contact",
  "register",
  "rsvp",
  "book",
  "visit",
  "call",
  "email",
  "subscribe",
  "sign up",
  "learn more",
  "read more",
] as const;

function isIgnorableRequestFailure(url: string, errorText: string) {
  if (errorText.includes("ERR_ABORTED") && url.includes("_rsc=")) {
    return true;
  }

  return false;
}

function shouldSkipRoute(route: string): boolean {
  const lower = route.toLowerCase();
  if (lower.startsWith("/_files/")) return true;
  if (lower.startsWith("/api/")) return true;
  if (lower.startsWith("/_next/")) return true;
  if (["/favicon.ico", "/robots.txt", "/sitemap.xml", "/blog-feed.xml"].includes(lower)) return true;
  if (/\.(pdf|doc|docx|xls|xlsx|zip|png|jpe?g|gif|webp|svg|xml|txt)$/i.test(lower)) return true;
  return false;
}

function loadRoutes() {
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

function toIssues(route: Omit<RouteAudit, "issues">): PageIssue[] {
  const issues: PageIssue[] = [];

  if (!route.status || route.status >= 400) {
    issues.push({
      code: "http_error",
      message: `Route returned ${route.status ?? "no response"}.`,
      severity: "high",
    });
  }

  if (route.dclMs && route.dclMs > 2500) {
    issues.push({
      code: "slow_dcl",
      message: `Slow DOMContentLoaded (${Math.round(route.dclMs)}ms).`,
      severity: route.dclMs > 4000 ? "high" : "medium",
    });
  }

  if (route.loadMs && route.loadMs > 4500) {
    issues.push({
      code: "slow_load",
      message: `Slow load event (${Math.round(route.loadMs)}ms).`,
      severity: route.loadMs > 7000 ? "high" : "medium",
    });
  }

  if (route.h1Count < 1) {
    issues.push({
      code: "missing_h1",
      message: "No visible H1 found.",
      severity: "medium",
    });
  }

  if (route.ctaCount < 1) {
    issues.push({
      code: "missing_cta",
      message: "No clear call-to-action link/button detected.",
      severity: "high",
    });
  }

  if (route.placeholderHits.length > 0) {
    issues.push({
      code: "placeholder_copy",
      message: `Placeholder/incomplete copy detected: ${route.placeholderHits.slice(0, 3).join(", ")}.`,
      severity: "high",
    });
  }

  if (route.brokenImages > 0) {
    issues.push({
      code: "broken_images",
      message: `${route.brokenImages} visible image(s) failed to render.`,
      severity: "high",
    });
  }

  if (route.lowResImages > 1) {
    issues.push({
      code: "low_res_images",
      message: `${route.lowResImages} visible image(s) appear low resolution.`,
      severity: route.lowResImages > 4 ? "high" : "medium",
    });
  }

  if (route.missingAltImages > 2) {
    issues.push({
      code: "missing_alt",
      message: `${route.missingAltImages} visible image(s) missing alt text.`,
      severity: "low",
    });
  }

  if (route.failedRequests > 0) {
    issues.push({
      code: "failed_requests",
      message: `${route.failedRequests} network request(s) failed.`,
      severity: "medium",
    });
  }

  if (route.consoleErrors > 0) {
    issues.push({
      code: "console_errors",
      message: `${route.consoleErrors} console error(s) observed.`,
      severity: "medium",
    });
  }

  return issues;
}

function buildMarkdown(results: RouteAudit[]) {
  const total = results.length;
  const withIssues = results.filter((item) => item.issues.length > 0);
  const high = withIssues.filter((item) => item.issues.some((issue) => issue.severity === "high")).length;
  const broken = results.filter((item) => (item.status ?? 0) >= 400 || item.error).length;

  const lines: string[] = [];
  lines.push("# Site Quality Audit");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Base URL: ${BASE_URL}`);
  lines.push("");
  lines.push(`- Routes audited: ${total}`);
  lines.push(`- Routes with issues: ${withIssues.length}`);
  lines.push(`- Routes with high-severity issues: ${high}`);
  lines.push(`- Broken/error routes: ${broken}`);
  lines.push("");
  lines.push("## Priority Routes");
  lines.push("");

  const priority = [...withIssues]
    .sort((a, b) => {
      const aHigh = a.issues.filter((issue) => issue.severity === "high").length;
      const bHigh = b.issues.filter((issue) => issue.severity === "high").length;
      if (aHigh !== bHigh) {
        return bHigh - aHigh;
      }
      return b.issues.length - a.issues.length;
    })
    .slice(0, 60);

  for (const item of priority) {
    lines.push(`### ${item.route}`);
    lines.push(`- Status: ${item.status ?? "error"} | DCL: ${item.dclMs ? Math.round(item.dclMs) : "n/a"}ms | Load: ${item.loadMs ? Math.round(item.loadMs) : "n/a"}ms`);
    lines.push(`- Images: ${item.imageCount}, low-res: ${item.lowResImages}, broken: ${item.brokenImages}, missing-alt: ${item.missingAltImages}`);
    lines.push(`- CTA count: ${item.ctaCount}, H1 count: ${item.h1Count}, failed requests: ${item.failedRequests}, console errors: ${item.consoleErrors}`);
    for (const issue of item.issues) {
      lines.push(`- [${issue.severity.toUpperCase()}] ${issue.message}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const routes = loadRoutes();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const results: RouteAudit[] = new Array(routes.length);
  let cursor = 0;

  async function auditRoute(route: string): Promise<RouteAudit> {
    const page = await context.newPage();
    let failedRequests = 0;
    let consoleErrors = 0;

    page.on("requestfailed", (request) => {
      const failure = request.failure();
      const errorText = failure?.errorText ?? "";
      if (isIgnorableRequestFailure(request.url(), errorText)) {
        return;
      }

      failedRequests += 1;
    });

    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedRequests += 1;
      }
    });

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors += 1;
      }
    });

    page.on("pageerror", () => {
      consoleErrors += 1;
    });

    try {
      const url = `${BASE_URL}${encodeURI(route)}`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      await page.waitForTimeout(550);

      const perf = (await page.evaluate(`
          (() => {
            const actionWords = ${JSON.stringify([...ACTION_WORDS])};
            const navigation = performance.getEntriesByType("navigation")[0];
            const dclMs = navigation ? navigation.domContentLoadedEventEnd - navigation.startTime : null;
            const loadMs = navigation ? navigation.loadEventEnd - navigation.startTime : null;

          const isVisible = (el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                Number(style.opacity || "1") !== 0 &&
                rect.width > 1 &&
              rect.height > 1
            );
          };

          const isInViewport = (el) => {
            const rect = el.getBoundingClientRect();
            return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
          };

            const placeholders = ["lorem ipsum", "coming soon", "todo", "tbd", "placeholder", "under construction"];
            const bodyText = document.body?.innerText?.toLowerCase() ?? "";
            const placeholderHits = placeholders.filter((token) => bodyText.includes(token));

          const h1Count = Array.from(document.querySelectorAll("h1")).filter((el) => isVisible(el)).length;

            const ctaRegex = new RegExp("\\\\b(" + actionWords.join("|") + ")\\\\b", "i");
            const ctaTargets = Array.from(document.querySelectorAll("a,button")).filter((el) => {
              if (!isVisible(el)) return false;
              const text = (el.textContent || "").trim().toLowerCase();
              return text.length > 0 && ctaRegex.test(text);
            });

          const images = Array.from(document.querySelectorAll("img")).filter(
            (img) => isVisible(img) && isInViewport(img),
          );
          let brokenImages = 0;
          let lowResImages = 0;
          let missingAltImages = 0;

            for (const img of images) {
              const rect = img.getBoundingClientRect();
            if (!img.complete) {
              continue;
            }

            if (img.naturalWidth === 0 || img.naturalHeight === 0) {
              brokenImages += 1;
            } else {
                const ratioW = img.naturalWidth / Math.max(rect.width, 1);
                const ratioH = img.naturalHeight / Math.max(rect.height, 1);
                if (ratioW < 0.85 || ratioH < 0.85) {
                  lowResImages += 1;
                }
              }

              const alt = (img.getAttribute("alt") || "").trim();
              if (!alt) {
                missingAltImages += 1;
              }
            }

            return {
              dclMs,
              loadMs,
              h1Count,
              ctaCount: ctaTargets.length,
              placeholderHits,
              imageCount: images.length,
              brokenImages,
              lowResImages,
              missingAltImages,
            };
          })()
        `)) as {
        dclMs: number | null;
        loadMs: number | null;
        h1Count: number;
        ctaCount: number;
        placeholderHits: string[];
        imageCount: number;
        brokenImages: number;
        lowResImages: number;
        missingAltImages: number;
      };

      const routeResult: Omit<RouteAudit, "issues"> = {
        route,
        status: response?.status() ?? null,
        dclMs: perf.dclMs,
        loadMs: perf.loadMs,
        h1Count: perf.h1Count,
        ctaCount: perf.ctaCount,
        placeholderHits: perf.placeholderHits,
        imageCount: perf.imageCount,
        brokenImages: perf.brokenImages,
        lowResImages: perf.lowResImages,
        missingAltImages: perf.missingAltImages,
        failedRequests,
        consoleErrors,
        error: null,
      };

      return {
        ...routeResult,
        issues: toIssues(routeResult),
      };
    } catch (error) {
      const routeResult: Omit<RouteAudit, "issues"> = {
        route,
        status: null,
        dclMs: null,
        loadMs: null,
        h1Count: 0,
        ctaCount: 0,
        placeholderHits: [],
        imageCount: 0,
        brokenImages: 0,
        lowResImages: 0,
        missingAltImages: 0,
        failedRequests,
        consoleErrors,
        error: String(error),
      };

      return {
        ...routeResult,
        issues: toIssues(routeResult),
      };
    } finally {
      await page.close();
    }
  }

  async function worker() {
    while (cursor < routes.length) {
      const idx = cursor++;
      const route = routes[idx];
      const result = await auditRoute(route);
      results[idx] = result;
      console.log(
        `[audit] ${route} status=${result.status ?? "error"} issues=${result.issues.length} dcl=${result.dclMs ? Math.round(result.dclMs) : "n/a"}ms`,
      );
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await browser.close();

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        totalRoutes: routes.length,
        results,
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(OUT_MD, buildMarkdown(results));

  const withIssues = results.filter((item) => item.issues.length > 0).length;
  const high = results.filter((item) => item.issues.some((issue) => issue.severity === "high")).length;
  const broken = results.filter((item) => (item.status ?? 0) >= 400 || item.error).length;
  console.log(`wrote ${OUT_JSON}`);
  console.log(`wrote ${OUT_MD}`);
  console.log(`routes=${routes.length} withIssues=${withIssues} highSeverity=${high} broken=${broken}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
