import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import {
  VISUAL_BREAKPOINTS,
  ensureDir,
  resolveRouteDescriptors,
  resolveVisualParityOutputRoot,
} from "./_shared";

type CaptureMode = "baseline" | "candidate";

type CaptureManifest = {
  mode: CaptureMode;
  baseUrl: string;
  generatedAt: string;
  waitAfterLoadMs: number;
  navigationTimeoutMs: number;
  routes: Array<{
    path: string;
    key: string;
  }>;
  breakpoints: Array<{
    name: string;
    width: number;
    height: number;
  }>;
};

function resolveMode(raw: string | undefined): CaptureMode {
  if (raw === "baseline" || raw === "candidate") {
    return raw;
  }

  throw new Error(`Capture mode must be \"baseline\" or \"candidate\". Received: ${raw ?? "<missing>"}`);
}

function resolveBaseUrl(mode: CaptureMode) {
  if (mode === "baseline") {
    return (process.env.VISUAL_PARITY_MIRROR_BASE_URL || "https://www.mekorhabracha.org").trim();
  }

  return (process.env.VISUAL_PARITY_NATIVE_BASE_URL || "http://127.0.0.1:3000").trim();
}

function resolveCaptureDir(mode: CaptureMode) {
  const root = resolveVisualParityOutputRoot();
  if (mode === "baseline") {
    return path.join(root, "proposed-baseline");
  }

  return path.join(root, "candidate");
}

function parseWaitMs() {
  const raw = process.env.VISUAL_PARITY_WAIT_AFTER_LOAD_MS?.trim();
  if (!raw) {
    return 1200;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`VISUAL_PARITY_WAIT_AFTER_LOAD_MS must be a non-negative integer. Received: ${raw}`);
  }

  return parsed;
}

function parseNavigationTimeoutMs() {
  const raw = process.env.VISUAL_PARITY_NAV_TIMEOUT_MS?.trim();
  if (!raw) {
    return 120_000;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`VISUAL_PARITY_NAV_TIMEOUT_MS must be a positive integer. Received: ${raw}`);
  }

  return parsed;
}

async function main() {
  const mode = resolveMode(process.argv[2]);
  const baseUrl = resolveBaseUrl(mode);
  const waitAfterLoadMs = parseWaitMs();
  const navigationTimeoutMs = parseNavigationTimeoutMs();
  const routes = resolveRouteDescriptors();
  const captureDir = resolveCaptureDir(mode);

  if (!baseUrl) {
    throw new Error("Resolved base URL is empty.");
  }

  await fs.rm(captureDir, { recursive: true, force: true });
  await ensureDir(captureDir);

  const browser = await chromium.launch({ headless: true });

  for (const breakpoint of VISUAL_BREAKPOINTS) {
    const context = await browser.newContext({
      viewport: { width: breakpoint.width, height: breakpoint.height },
      colorScheme: "light",
      reducedMotion: "reduce",
    });

    const page = await context.newPage();

    for (const route of routes) {
      const url = new URL(route.path, baseUrl).toString();
      const routeDir = path.join(captureDir, route.key);
      const screenshotPath = path.join(routeDir, `${breakpoint.name}.png`);

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: navigationTimeoutMs });
      await page.addStyleTag({
        content:
          "*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important;}html{scroll-behavior:auto !important;}",
      });
      await page.waitForTimeout(waitAfterLoadMs);
      await ensureDir(routeDir);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      console.log(`[capture:${mode}] ${breakpoint.name} ${route.path} -> ${screenshotPath}`);
    }

    await context.close();
  }

  await browser.close();

  const manifest: CaptureManifest = {
    mode,
    baseUrl,
    generatedAt: new Date().toISOString(),
    waitAfterLoadMs,
    navigationTimeoutMs,
    routes,
    breakpoints: VISUAL_BREAKPOINTS.map((bp) => ({
      name: bp.name,
      width: bp.width,
      height: bp.height,
    })),
  };

  const manifestPath = path.join(captureDir, "capture-manifest.json");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`[capture:${mode}] wrote ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
