import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { chromium, type Page } from "playwright";
import { PNG } from "pngjs";

import {
  blendOver,
  classifyFailure,
  contrastRatio,
  isLargeText,
  parseCssColor,
  relativeLuminance,
  rgbaToCss,
} from "./contrast-lib";
import {
  CONTRAST_BREAKPOINTS,
  INTERACTIVE_STATES,
  resolveContrastRoutes,
  type ContrastBreakpoint,
  type InteractiveStateId,
} from "./contrast-routes";

type DomSample = {
  tag: string;
  textSnippet: string;
  fgCss: string;
  bgCss: string;
  bgApproximate: boolean;
  fontSizePx: number;
  fontWeight: string;
  selectorHint: string;
  box: { x: number; y: number; width: number; height: number };
};

const require = createRequire(import.meta.url);
// Plain JS sampler — avoids tsx injecting __name into page.evaluate bundles.
const sampleContrastDom = require("./contrast-sample.browser.js") as () => DomSample[];

type SampledIssue = {
  route: string;
  state: InteractiveStateId;
  breakpoint: ContrastBreakpoint["name"];
  tag: string;
  textSnippet: string;
  fg: string;
  bg: string;
  ratio: number;
  large: boolean;
  verdict: "fail-aa";
  bgApproximate: boolean;
  selectorHint: string;
};

type CrawlReport = {
  generatedAt: string;
  baseUrl: string;
  failOnAa: boolean;
  routeCount: number;
  issueCount: number;
  issues: SampledIssue[];
  skipped: Array<{ route: string; state: InteractiveStateId; breakpoint: string; reason: string }>;
  screenshotCount: number;
};

const PROJECT_ROOT = process.cwd();
const BASE_URL = (process.env.CONTRAST_CRAWL_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT_DIR = process.env.CONTRAST_CRAWL_OUT_DIR
  ? path.resolve(process.env.CONTRAST_CRAWL_OUT_DIR)
  : path.join(PROJECT_ROOT, "output/review");
const SCREEN_DIR = path.join(OUT_DIR, "contrast-screenshots");
const NAV_TIMEOUT = Number(process.env.CONTRAST_CRAWL_TIMEOUT_MS ?? "45000");
const MAX_SCREENSHOTS = Number(process.env.CONTRAST_CRAWL_MAX_SCREENSHOTS ?? "40");
const FAIL_ON_AA = process.env.CONTRAST_CRAWL_FAIL_ON_AA === "1";

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugPart(value: string) {
  return value
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48) || "home";
}

async function applyInteractiveState(page: Page, state: InteractiveStateId) {
  if (state === "default") return true;

  if (state === "mobile-drawer") {
    const trigger = page.getByRole("button", { name: /open main menu|open menu/i });
    if ((await trigger.count()) === 0) return false;
    await trigger.first().click({ timeout: 5000 });
    const opened = await page
      .locator("#native-mobile-drawer, [role='dialog']")
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    return opened;
  }

  if (state === "give-menu") {
    const trigger = page.getByRole("button", { name: /more giving options/i });
    if ((await trigger.count()) === 0) return false;
    await trigger.first().click({ timeout: 5000 });
    const opened = await page
      .locator("#native-give-menu")
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    return opened;
  }

  if (state === "feedback-sheet") {
    const trigger = page.getByRole("button", { name: /share an idea/i });
    if ((await trigger.count()) === 0) return false;
    await trigger.first().click({ timeout: 5000 });
    const opened = await page
      .locator("[role='dialog']")
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    return opened;
  }

  return false;
}

async function sampleDom(page: Page): Promise<DomSample[]> {
  return page.evaluate(sampleContrastDom);
}

function toIssue(
  sample: DomSample,
  route: string,
  state: InteractiveStateId,
  breakpoint: ContrastBreakpoint["name"],
): SampledIssue | null {
  const fg = parseCssColor(sample.fgCss);
  const bg = parseCssColor(sample.bgCss);
  if (!fg || !bg) return null;
  const opaqueFg = fg.a < 0.999 ? blendOver(fg, bg) : fg;
  const ratio = contrastRatio(opaqueFg, bg);
  const large = isLargeText(sample.fontSizePx, sample.fontWeight);
  if (classifyFailure(ratio, large) !== "fail-aa") return null;
  return {
    route,
    state,
    breakpoint,
    tag: sample.tag,
    textSnippet: sample.textSnippet,
    fg: rgbaToCss(opaqueFg),
    bg: rgbaToCss(bg),
    ratio: Number(ratio.toFixed(2)),
    large,
    verdict: "fail-aa",
    bgApproximate: sample.bgApproximate,
    selectorHint: sample.selectorHint,
  };
}

async function averageScreenshotLuminance(page: Page, box: DomSample["box"]): Promise<number | null> {
  try {
    const clip = {
      x: Math.max(0, Math.floor(box.x)),
      y: Math.max(0, Math.floor(box.y)),
      width: Math.max(1, Math.min(Math.ceil(box.width), 400)),
      height: Math.max(1, Math.min(Math.ceil(box.height), 200)),
    };
    const buffer = await page.screenshot({ clip, type: "png" });
    const png = PNG.sync.read(buffer);
    let total = 0;
    let count = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      const a = png.data[i + 3]! / 255;
      if (a < 0.2) continue;
      const r = png.data[i]!;
      const g = png.data[i + 1]!;
      const b = png.data[i + 2]!;
      total += relativeLuminance({ r, g, b });
      count += 1;
    }
    if (count === 0) return null;
    return total / count;
  } catch {
    return null;
  }
}

function buildMarkdown(report: CrawlReport) {
  const lines: string[] = [];
  lines.push("# Contrast Crawl Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Base URL: ${report.baseUrl}`);
  lines.push(`Routes: ${report.routeCount}`);
  lines.push(`AA failures (unique): ${report.issueCount}`);
  lines.push(`Screenshots: ${report.screenshotCount}`);
  lines.push("");

  const byRoute = new Map<string, SampledIssue[]>();
  for (const issue of report.issues) {
    const key = `${issue.route} [${issue.breakpoint}/${issue.state}]`;
    const list = byRoute.get(key) ?? [];
    list.push(issue);
    byRoute.set(key, list);
  }

  lines.push("## Failures by route");
  lines.push("");
  if (byRoute.size === 0) {
    lines.push("No WCAG AA contrast failures found in the crawled set.");
    lines.push("");
  } else {
    for (const [key, issues] of [...byRoute.entries()].sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`### ${key} (${issues.length})`);
      for (const issue of issues.slice(0, 25)) {
        lines.push(
          `- \`${issue.ratio}:1\` ${issue.large ? "large" : "normal"} — “${issue.textSnippet.replace(/\|/g, "/")}” — fg ${issue.fg} on bg ${issue.bg}${issue.bgApproximate ? " ~(approx bg)" : ""} — \`${issue.selectorHint}\``,
        );
      }
      if (issues.length > 25) lines.push(`- …and ${issues.length - 25} more`);
      lines.push("");
    }
  }

  if (report.skipped.length) {
    lines.push("## Skipped interactions");
    lines.push("");
    for (const skip of report.skipped.slice(0, 40)) {
      lines.push(`- ${skip.route} / ${skip.breakpoint} / ${skip.state}: ${skip.reason}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const routes = resolveContrastRoutes();
  ensureDir(OUT_DIR);
  ensureDir(SCREEN_DIR);

  const browser = await chromium.launch({ headless: true });
  const issues: SampledIssue[] = [];
  const skipped: CrawlReport["skipped"] = [];
  const issueKeys = new Set<string>();
  let screenshotCount = 0;

  try {
    for (const breakpoint of CONTRAST_BREAKPOINTS) {
      for (const state of INTERACTIVE_STATES) {
        if (!state.breakpoints.includes(breakpoint.name)) continue;
        const stateRoutes = state.id === "default" ? routes : state.routes.filter((route) => routes.includes(route));
        for (const route of stateRoutes) {
          const context = await browser.newContext({
            viewport: { width: breakpoint.width, height: breakpoint.height },
            colorScheme: "light",
            reducedMotion: "reduce",
          });
          const page = await context.newPage();
          const url = `${BASE_URL}${encodeURI(route)}`;
          try {
            const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
            const status = response?.status() ?? 0;
            if (status >= 400) {
              skipped.push({
                route,
                state: state.id,
                breakpoint: breakpoint.name,
                reason: `HTTP ${status}`,
              });
              await context.close();
              continue;
            }
            await page.waitForTimeout(500);

            const applied = await applyInteractiveState(page, state.id);
            if (!applied && state.id !== "default") {
              skipped.push({
                route,
                state: state.id,
                breakpoint: breakpoint.name,
                reason: "interaction control not found",
              });
              await context.close();
              continue;
            }
            if (state.id !== "default") {
              await page.waitForTimeout(350);
            }

            const samples = await sampleDom(page);
            for (const sample of samples) {
              let issue = toIssue(sample, route, state.id, breakpoint.name);
              if (!issue) continue;

              // For approximate gradient backgrounds, confirm with screenshot luminance when possible.
              if (issue.bgApproximate) {
                const avgL = await averageScreenshotLuminance(page, sample.box);
                const fg = parseCssColor(issue.fg);
                if (avgL !== null && fg) {
                  const fgL = relativeLuminance(fg);
                  const lighter = Math.max(fgL, avgL);
                  const darker = Math.min(fgL, avgL);
                  const shotRatio = (lighter + 0.05) / (darker + 0.05);
                  if (classifyFailure(shotRatio, issue.large) !== "fail-aa") {
                    continue;
                  }
                  issue = { ...issue, ratio: Number(shotRatio.toFixed(2)) };
                }
              }

              const key = `${issue.route}|${issue.state}|${issue.breakpoint}|${issue.textSnippet}|${issue.fg}|${issue.bg}`;
              if (issueKeys.has(key)) continue;
              issueKeys.add(key);
              issues.push(issue);

              if (screenshotCount < MAX_SCREENSHOTS) {
                const base = `${String(screenshotCount + 1).padStart(2, "0")}-${slugPart(route)}-${breakpoint.name}-${state.id}-${slugPart(issue.textSnippet)}`;
                try {
                  await page.screenshot({
                    path: path.join(SCREEN_DIR, `${base}-page.png`),
                    fullPage: false,
                  });
                  const clip = {
                    x: Math.max(0, Math.floor(sample.box.x - 8)),
                    y: Math.max(0, Math.floor(sample.box.y - 8)),
                    width: Math.max(1, Math.ceil(sample.box.width + 16)),
                    height: Math.max(1, Math.ceil(sample.box.height + 16)),
                  };
                  await page.screenshot({
                    path: path.join(SCREEN_DIR, `${base}-el.png`),
                    clip,
                  });
                  screenshotCount += 1;
                } catch {
                  // Element may have scrolled away; keep the issue without screenshot.
                }
              }
            }
          } catch (error) {
            skipped.push({
              route,
              state: state.id,
              breakpoint: breakpoint.name,
              reason: error instanceof Error ? error.message : String(error),
            });
          } finally {
            await context.close();
          }

          process.stdout.write(
            `[contrast] ${breakpoint.name} ${state.id} ${route} → running total failures: ${issues.length}\n`,
          );
        }
      }
    }
  } finally {
    await browser.close();
  }

  issues.sort((a, b) => a.ratio - b.ratio || a.route.localeCompare(b.route));

  const report: CrawlReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    failOnAa: FAIL_ON_AA,
    routeCount: routes.length,
    issueCount: issues.length,
    issues,
    skipped,
    screenshotCount,
  };

  const jsonPath = path.join(OUT_DIR, "contrast-crawl-latest.json");
  const mdPath = path.join(OUT_DIR, "contrast-crawl-latest.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, buildMarkdown(report), "utf8");

  console.log(`[contrast] Wrote ${jsonPath}`);
  console.log(`[contrast] Wrote ${mdPath}`);
  console.log(`[contrast] AA failures: ${issues.length}; screenshots: ${screenshotCount}; skipped: ${skipped.length}`);

  if (FAIL_ON_AA && issues.length > 0) {
    process.exitCode = 1;
  }
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
