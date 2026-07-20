import fs from "node:fs";
import path from "node:path";

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
  type Rgba,
} from "./contrast-lib";
import {
  CONTRAST_BREAKPOINTS,
  INTERACTIVE_STATES,
  resolveContrastRoutes,
  type ContrastBreakpoint,
  type InteractiveStateId,
} from "./contrast-routes";

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
    await page.locator("#native-mobile-drawer").waitFor({ state: "visible", timeout: 5000 }).catch(() => null);
    return true;
  }

  if (state === "give-menu") {
    const trigger = page.getByRole("button", { name: /more giving options/i });
    if ((await trigger.count()) === 0) return false;
    await trigger.first().click({ timeout: 5000 });
    await page.locator("#native-give-menu").waitFor({ state: "visible", timeout: 5000 }).catch(() => null);
    return true;
  }

  if (state === "feedback-sheet") {
    const trigger = page.getByRole("button", { name: /share an idea|feedback|suggestion/i });
    if ((await trigger.count()) === 0) {
      // Fallback: floating launcher often has accessible name from visible text.
      const alt = page.locator("[data-slot='sheet-trigger'], button").filter({ hasText: /idea|feedback/i });
      if ((await alt.count()) === 0) return false;
      await alt.first().click({ timeout: 5000 });
    } else {
      await trigger.first().click({ timeout: 5000 });
    }
    await page.waitForTimeout(400);
    return true;
  }

  return false;
}

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

async function sampleDom(page: Page): Promise<DomSample[]> {
  return page.evaluate(() => {
    const SELECTOR = "a, button, [role='button'], input, label, h1, h2, h3, h4, h5, h6, p, li, span, td, th";

    function canvasResolveColor(css: string): { r: number; g: number; b: number; a: number } | null {
      if (!css || css === "transparent") return null;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#000000";
        ctx.fillStyle = css;
        const resolved = ctx.fillStyle;
        // fillStyle normalizes to #rrggbb for opaque colors
        if (typeof resolved === "string" && resolved.startsWith("#") && resolved.length === 7) {
          return {
            r: Number.parseInt(resolved.slice(1, 3), 16),
            g: Number.parseInt(resolved.slice(3, 5), 16),
            b: Number.parseInt(resolved.slice(5, 7), 16),
            a: 1,
          };
        }
        const match = String(resolved).match(/rgba?\(([^)]+)\)/i);
        if (!match) return null;
        const parts = match[1]!.split(",").map((p) => Number.parseFloat(p.trim()));
        if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
        return {
          r: parts[0]!,
          g: parts[1]!,
          b: parts[2]!,
          a: parts[3] === undefined ? 1 : parts[3]!,
        };
      } catch {
        return null;
      }
    }

    function parseRgb(css: string) {
      const direct = canvasResolveColor(css);
      return direct;
    }

    function blend(
      fg: { r: number; g: number; b: number; a: number },
      bg: { r: number; g: number; b: number },
    ) {
      const a = Math.min(1, Math.max(0, fg.a));
      return {
        r: Math.round(fg.r * a + bg.r * (1 - a)),
        g: Math.round(fg.g * a + bg.g * (1 - a)),
        b: Math.round(fg.b * a + bg.b * (1 - a)),
        a: 1,
      };
    }

    function extractGradientColors(backgroundImage: string) {
      const colors: Array<{ r: number; g: number; b: number; a: number }> = [];
      const hexes = backgroundImage.match(/#([0-9a-f]{3,8})\b/gi) ?? [];
      for (const hex of hexes) {
        const parsed = canvasResolveColor(hex);
        if (parsed) colors.push(parsed);
      }
      const rgbs = backgroundImage.match(/rgba?\([^)]+\)/gi) ?? [];
      for (const rgb of rgbs) {
        const parsed = canvasResolveColor(rgb);
        if (parsed) colors.push(parsed);
      }
      return colors;
    }

    function averageColors(colors: Array<{ r: number; g: number; b: number; a: number }>) {
      if (colors.length === 0) return null;
      const acc = colors.reduce(
        (sum, c) => ({ r: sum.r + c.r, g: sum.g + c.g, b: sum.b + c.b }),
        { r: 0, g: 0, b: 0 },
      );
      return {
        r: Math.round(acc.r / colors.length),
        g: Math.round(acc.g / colors.length),
        b: Math.round(acc.b / colors.length),
        a: 1,
      };
    }

    function isVisible(el: Element) {
      if (!(el instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (Number(style.opacity || "1") <= 0.01) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      // Skip elements entirely off-screen horizontally beyond a generous margin.
      if (rect.bottom < -20 || rect.top > window.innerHeight + 2000) return false;
      return true;
    }

    function textOf(el: HTMLElement) {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return (el.value || el.placeholder || el.getAttribute("aria-label") || "").trim();
      }
      const label = el.getAttribute("aria-label");
      if (label && label.trim()) return label.trim();
      return (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    }

    function selectorHint(el: Element) {
      const parts: string[] = [el.tagName.toLowerCase()];
      if (el.id) parts.push(`#${el.id}`);
      const className = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
      if (className) parts.push(`.${className}`);
      const href = el.getAttribute("href");
      if (href) parts.push(`[href="${href.slice(0, 60)}"]`);
      return parts.join("");
    }

    const pageBg =
      parseRgb(getComputedStyle(document.body).backgroundColor) ||
      parseRgb(getComputedStyle(document.documentElement).backgroundColor) || {
        r: 255,
        g: 255,
        b: 255,
        a: 1,
      };

    const samples: DomSample[] = [];
    const seen = new Set<string>();

    for (const node of Array.from(document.querySelectorAll(SELECTOR))) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.closest("iframe, svg, noscript, script, style")) continue;
      if (!isVisible(node)) continue;

      const text = textOf(node);
      if (!text || text.length < 1) continue;
      // Prefer leaf-ish nodes: skip containers whose only text comes from many children
      // when the element itself has > 4 element children and is a generic span/div-like.
      if ((node.tagName === "SPAN" || node.tagName === "LI") && node.querySelectorAll("a,button,p,h1,h2,h3").length > 0) {
        continue;
      }

      const style = getComputedStyle(node);
      const fgParsed = parseRgb(style.color);
      if (!fgParsed) continue;

      let bg: { r: number; g: number; b: number; a: number } = {
        r: pageBg.r,
        g: pageBg.g,
        b: pageBg.b,
        a: 1,
      };
      let bgApproximate = false;
      let foundOpaque = false;

      let current: HTMLElement | null = node;
      const layers: Array<{ r: number; g: number; b: number; a: number }> = [];
      while (current) {
        const cs = getComputedStyle(current);
        const bgc = parseRgb(cs.backgroundColor);
        const image = cs.backgroundImage || "none";
        if (image && image !== "none" && /gradient/i.test(image)) {
          const stops = extractGradientColors(image);
          const avg = averageColors(stops);
          if (avg) {
            layers.push(avg);
            bgApproximate = true;
            foundOpaque = true;
            break;
          }
        }
        if (bgc && bgc.a > 0.01) {
          layers.push(bgc);
          if (bgc.a >= 0.98) {
            foundOpaque = true;
            break;
          }
        }
        current = current.parentElement;
      }

      // Composite from outermost collected layer down onto page background.
      bg = { r: pageBg.r, g: pageBg.g, b: pageBg.b, a: 1 };
      for (const layer of layers.reverse()) {
        bg = blend(layer, bg);
      }
      if (!foundOpaque && layers.length === 0) {
        bgApproximate = true;
      }

      const fg = fgParsed.a < 0.999 ? blend(fgParsed, bg) : fgParsed;
      const snippet = text.slice(0, 80);
      const key = `${node.tagName}|${snippet}|${fg.r},${fg.g},${fg.b}|${bg.r},${bg.g},${bg.b}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const rect = node.getBoundingClientRect();
      samples.push({
        tag: node.tagName.toLowerCase(),
        textSnippet: snippet,
        fgCss: `rgb(${fg.r}, ${fg.g}, ${fg.b})`,
        bgCss: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
        bgApproximate,
        fontSizePx: Number.parseFloat(style.fontSize) || 16,
        fontWeight: style.fontWeight || "400",
        selectorHint: selectorHint(node),
        box: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      });
    }

    return samples;
  });
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
