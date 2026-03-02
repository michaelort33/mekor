import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

import {
  DEFAULT_BASELINE_DIR,
  VISUAL_BREAKPOINTS,
  ensureDir,
  parseThresholdPercent,
  resolveRouteDescriptors,
  resolveVisualParityOutputRoot,
} from "./_shared";

type ChangedRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelCount: number;
};

type DiffResult = {
  route: string;
  routeKey: string;
  breakpoint: string;
  width: number;
  height: number;
  diffPixels: number;
  totalPixels: number;
  diffPercent: number;
  thresholdPercent: number;
  pass: boolean;
  baselineImage: string;
  candidateImage: string;
  diffImage: string;
  changedRegionOverlay: string;
  changedRegions: ChangedRegion[];
};

type MissingAsset = {
  route: string;
  routeKey: string;
  breakpoint: string;
  reason: string;
  filePath: string;
};

function resolveBaselineDir() {
  return path.resolve(process.env.VISUAL_PARITY_BASELINE_DIR?.trim() || DEFAULT_BASELINE_DIR);
}

function resolveCandidateDir() {
  return path.resolve(
    process.env.VISUAL_PARITY_CANDIDATE_DIR?.trim() ||
      path.join(resolveVisualParityOutputRoot(), "candidate"),
  );
}

function resolveReportDir() {
  return path.resolve(
    process.env.VISUAL_PARITY_REPORT_DIR?.trim() ||
      path.join(resolveVisualParityOutputRoot(), "report"),
  );
}

function extractChangedRegions(diffPng: PNG) {
  const width = diffPng.width;
  const height = diffPng.height;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    if (diffPng.data[i * 4 + 3] > 0) {
      mask[i] = 1;
    }
  }

  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  const regions: ChangedRegion[] = [];

  for (let idx = 0; idx < mask.length; idx += 1) {
    if (mask[idx] === 0 || visited[idx] === 1) {
      continue;
    }

    visited[idx] = 1;
    let head = 0;
    let tail = 0;
    queue[tail] = idx;
    tail += 1;

    let pixelCount = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    while (head < tail) {
      const current = queue[head];
      head += 1;

      const x = current % width;
      const y = Math.floor(current / width);

      pixelCount += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue;
          }

          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }

          const neighborIndex = ny * width + nx;
          if (mask[neighborIndex] === 0 || visited[neighborIndex] === 1) {
            continue;
          }

          visited[neighborIndex] = 1;
          queue[tail] = neighborIndex;
          tail += 1;
        }
      }
    }

    if (pixelCount < 20) {
      continue;
    }

    regions.push({
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixelCount,
    });
  }

  return regions.sort((a, b) => b.pixelCount - a.pixelCount).slice(0, 20);
}

function drawHorizontalLine(
  png: PNG,
  startX: number,
  endX: number,
  y: number,
  rgba: [number, number, number, number],
) {
  for (let x = startX; x <= endX; x += 1) {
    const index = (y * png.width + x) * 4;
    png.data[index] = rgba[0];
    png.data[index + 1] = rgba[1];
    png.data[index + 2] = rgba[2];
    png.data[index + 3] = rgba[3];
  }
}

function drawVerticalLine(
  png: PNG,
  x: number,
  startY: number,
  endY: number,
  rgba: [number, number, number, number],
) {
  for (let y = startY; y <= endY; y += 1) {
    const index = (y * png.width + x) * 4;
    png.data[index] = rgba[0];
    png.data[index + 1] = rgba[1];
    png.data[index + 2] = rgba[2];
    png.data[index + 3] = rgba[3];
  }
}

function drawRegionsOverlay(candidatePng: PNG, regions: ChangedRegion[]) {
  const rgba: [number, number, number, number] = [255, 0, 0, 255];

  for (const region of regions.slice(0, 12)) {
    const x1 = Math.max(0, region.x);
    const y1 = Math.max(0, region.y);
    const x2 = Math.min(candidatePng.width - 1, region.x + region.width - 1);
    const y2 = Math.min(candidatePng.height - 1, region.y + region.height - 1);

    if (x2 <= x1 || y2 <= y1) {
      continue;
    }

    drawHorizontalLine(candidatePng, x1, x2, y1, rgba);
    drawHorizontalLine(candidatePng, x1, x2, y2, rgba);
    drawVerticalLine(candidatePng, x1, y1, y2, rgba);
    drawVerticalLine(candidatePng, x2, y1, y2, rgba);
  }
}

function relativeToReport(reportDir: string, filePath: string) {
  return path.relative(reportDir, filePath).replace(/\\/g, "/");
}

function formatPercent(value: number) {
  return `${value.toFixed(3)}%`;
}

function toMarkdown(summary: {
  generatedAt: string;
  thresholdPercent: number;
  baselineDir: string;
  candidateDir: string;
  reportDir: string;
  totalComparisons: number;
  passCount: number;
  failCount: number;
  missingCount: number;
  failures: DiffResult[];
  missingAssets: MissingAsset[];
  results: DiffResult[];
}) {
  const lines: string[] = [];
  lines.push("# Visual Parity Report");
  lines.push("");
  lines.push(`- Generated: ${summary.generatedAt}`);
  lines.push(`- Threshold: ${summary.thresholdPercent}%`);
  lines.push(`- Baseline dir: ${summary.baselineDir}`);
  lines.push(`- Candidate dir: ${summary.candidateDir}`);
  lines.push(`- Comparisons: ${summary.totalComparisons}`);
  lines.push(`- Passed: ${summary.passCount}`);
  lines.push(`- Failed: ${summary.failCount}`);
  lines.push(`- Missing assets: ${summary.missingCount}`);
  lines.push("");

  lines.push("## Per Route/Breakpoint Results");
  lines.push("");
  lines.push("| Route | Breakpoint | Diff % | Status | Diff Image | Changed Regions Overlay |");
  lines.push("| --- | --- | ---: | --- | --- | --- |");

  for (const result of summary.results) {
    const status = result.pass ? "PASS" : "FAIL";
    lines.push(
      `| ${result.route} | ${result.breakpoint} | ${formatPercent(result.diffPercent)} | ${status} | [diff](${result.diffImage}) | [overlay](${result.changedRegionOverlay}) |`,
    );
  }

  if (summary.missingAssets.length > 0) {
    lines.push("");
    lines.push("## Missing Assets");
    lines.push("");
    for (const missing of summary.missingAssets) {
      lines.push(
        `- ${missing.route} (${missing.breakpoint}): ${missing.reason} at ${missing.filePath}`,
      );
    }
  }

  if (summary.failures.length > 0) {
    lines.push("");
    lines.push("## Out-of-Threshold Entries");
    lines.push("");
    for (const failure of summary.failures) {
      const topRegion = failure.changedRegions[0]
        ? `top changed region x=${failure.changedRegions[0].x}, y=${failure.changedRegions[0].y}, w=${failure.changedRegions[0].width}, h=${failure.changedRegions[0].height}`
        : "no changed region above minimum pixel cluster";
      lines.push(
        `- ${failure.route} (${failure.breakpoint}) diff ${formatPercent(failure.diffPercent)} > ${failure.thresholdPercent}% (${topRegion})`,
      );
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const baselineDir = resolveBaselineDir();
  const candidateDir = resolveCandidateDir();
  const reportDir = resolveReportDir();
  const thresholdPercent = parseThresholdPercent();

  await fs.promises.rm(reportDir, { recursive: true, force: true });
  await ensureDir(reportDir);

  const routes = resolveRouteDescriptors();
  const results: DiffResult[] = [];
  const missingAssets: MissingAsset[] = [];

  for (const route of routes) {
    for (const breakpoint of VISUAL_BREAKPOINTS) {
      const baselinePath = path.join(baselineDir, route.key, `${breakpoint.name}.png`);
      const candidatePath = path.join(candidateDir, route.key, `${breakpoint.name}.png`);

      if (!fs.existsSync(baselinePath)) {
        missingAssets.push({
          route: route.path,
          routeKey: route.key,
          breakpoint: breakpoint.name,
          reason: "baseline screenshot missing",
          filePath: baselinePath,
        });
        continue;
      }

      if (!fs.existsSync(candidatePath)) {
        missingAssets.push({
          route: route.path,
          routeKey: route.key,
          breakpoint: breakpoint.name,
          reason: "candidate screenshot missing",
          filePath: candidatePath,
        });
        continue;
      }

      const baselinePng = PNG.sync.read(await fsp.readFile(baselinePath));
      const candidatePng = PNG.sync.read(await fsp.readFile(candidatePath));

      if (baselinePng.width !== candidatePng.width || baselinePng.height !== candidatePng.height) {
        missingAssets.push({
          route: route.path,
          routeKey: route.key,
          breakpoint: breakpoint.name,
          reason: `dimension mismatch baseline=${baselinePng.width}x${baselinePng.height} candidate=${candidatePng.width}x${candidatePng.height}`,
          filePath: candidatePath,
        });
        continue;
      }

      const diffPng = new PNG({ width: baselinePng.width, height: baselinePng.height });
      const diffPixels = pixelmatch(baselinePng.data, candidatePng.data, diffPng.data, baselinePng.width, baselinePng.height, {
        threshold: 0.1,
        diffMask: true,
      });
      const totalPixels = baselinePng.width * baselinePng.height;
      const diffPercent = (diffPixels / totalPixels) * 100;
      const pass = diffPercent <= thresholdPercent;
      const changedRegions = extractChangedRegions(diffPng);

      const diffPath = path.join(reportDir, "diff", route.key, `${breakpoint.name}.png`);
      const overlayPath = path.join(reportDir, "changed-regions", route.key, `${breakpoint.name}.png`);

      await ensureDir(path.dirname(diffPath));
      await ensureDir(path.dirname(overlayPath));

      await fsp.writeFile(diffPath, PNG.sync.write(diffPng));

      const overlayPng = PNG.sync.read(await fsp.readFile(candidatePath));
      drawRegionsOverlay(overlayPng, changedRegions);
      await fsp.writeFile(overlayPath, PNG.sync.write(overlayPng));

      const result: DiffResult = {
        route: route.path,
        routeKey: route.key,
        breakpoint: breakpoint.name,
        width: baselinePng.width,
        height: baselinePng.height,
        diffPixels,
        totalPixels,
        diffPercent,
        thresholdPercent,
        pass,
        baselineImage: path.relative(process.cwd(), baselinePath).replace(/\\/g, "/"),
        candidateImage: path.relative(process.cwd(), candidatePath).replace(/\\/g, "/"),
        diffImage: relativeToReport(reportDir, diffPath),
        changedRegionOverlay: relativeToReport(reportDir, overlayPath),
        changedRegions,
      };

      results.push(result);
      console.log(
        `[report] ${route.path} ${breakpoint.name}: diff=${formatPercent(diffPercent)} (${pass ? "PASS" : "FAIL"})`,
      );
    }
  }

  const failures = results.filter((result) => !result.pass);
  const summary = {
    generatedAt: new Date().toISOString(),
    thresholdPercent,
    baselineDir,
    candidateDir,
    reportDir,
    totalComparisons: results.length,
    passCount: results.length - failures.length,
    failCount: failures.length,
    missingCount: missingAssets.length,
    failures,
    missingAssets,
    results,
  };

  const jsonPath = path.join(reportDir, "summary.json");
  const markdownPath = path.join(reportDir, "summary.md");
  await fsp.writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await fsp.writeFile(markdownPath, toMarkdown(summary), "utf8");

  console.log(`[report] wrote ${jsonPath}`);
  console.log(`[report] wrote ${markdownPath}`);
  console.log(
    `[report] comparisons=${summary.totalComparisons} pass=${summary.passCount} fail=${summary.failCount} missing=${summary.missingCount}`,
  );

  if (missingAssets.length > 0 || failures.length > 0) {
    if (missingAssets.length > 0) {
      console.error(
        `[report] missing baseline/candidate assets detected. Refresh baseline via workflow_dispatch: Visual Parity Baseline Refresh`,
      );
    }
    if (failures.length > 0) {
      console.error(`[report] threshold breaches detected (>${thresholdPercent}%).`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
