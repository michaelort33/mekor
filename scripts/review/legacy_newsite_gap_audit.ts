import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

type ManifestEntry = {
  index: number;
  url: string;
  kind: string;
  status: string;
  outputDir: string;
  title?: string;
};

type LegacyPage = {
  index: number;
  oldUrl: string;
  oldPath: string;
  title: string;
  oldWordCount: number;
  lines: string[];
};

type AuditRow = {
  oldUrl: string;
  oldPath: string;
  newUrl: string;
  statusCode: number;
  titleOld: string;
  titleNew: string;
  oldWordCount: number;
  newWordCount: number;
  oldLineCount: number;
  matchedLineCount: number;
  lineCoverage: number;
  missingLines: string[];
  notes: string;
};

const ROOT = process.cwd();
const LEGACY_EXPORT_ROOT = path.join(ROOT, "output", "mekorhabracha-site-export-2026-03-09");
const DEFAULT_BASE_URL = "http://localhost:3001";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLine(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function extractBodyText(markdownText: string) {
  const marker = "## Body Text";
  if (!markdownText.includes(marker)) {
    return markdownText;
  }

  const section = markdownText.split(marker, 2)[1] ?? "";
  if (!section.includes("```text")) {
    return section.trim();
  }

  return section.split("```text", 2)[1]?.split("```", 2)[0]?.trim() ?? "";
}

function significantLines(text: string) {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = normalizeWhitespace(rawLine);
    const normalized = normalizeLine(line);
    if (normalized.length < 18 || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    lines.push(line);
  }
  return lines;
}

async function loadLegacyPages() {
  const manifest = JSON.parse(await readFile(path.join(LEGACY_EXPORT_ROOT, "manifest.json"), "utf8")) as ManifestEntry[];
  const pages: LegacyPage[] = [];

  for (const record of manifest) {
    if (record.status !== "ok" || record.kind !== "html") {
      continue;
    }

    const contentPath = path.join(record.outputDir, "content.md");
    const markdownText = await readFile(contentPath, "utf8");
    const bodyText = extractBodyText(markdownText);
    const url = new URL(record.url);
    pages.push({
      index: record.index,
      oldUrl: record.url,
      oldPath: `${url.pathname}${url.search}`,
      title: record.title ?? "",
      oldWordCount: bodyText.match(/\b\w+\b/g)?.length ?? 0,
      lines: significantLines(bodyText),
    });
  }

  const lineCounts = new Map<string, number>();
  for (const page of pages) {
    for (const line of page.lines) {
      const normalized = normalizeLine(line);
      lineCounts.set(normalized, (lineCounts.get(normalized) ?? 0) + 1);
    }
  }

  return pages.map((page) => ({
    ...page,
    lines: page.lines.filter((line) => (lineCounts.get(normalizeLine(line)) ?? 0) < 25),
  }));
}

function toCsv(rows: AuditRow[]) {
  const headers = [
    "oldUrl",
    "oldPath",
    "newUrl",
    "statusCode",
    "titleOld",
    "titleNew",
    "oldWordCount",
    "newWordCount",
    "oldLineCount",
    "matchedLineCount",
    "lineCoverage",
    "notes",
  ];

  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.oldUrl,
        row.oldPath,
        row.newUrl,
        row.statusCode,
        row.titleOld,
        row.titleNew,
        row.oldWordCount,
        row.newWordCount,
        row.oldLineCount,
        row.matchedLineCount,
        row.lineCoverage,
        row.notes,
      ]
        .map(escape)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const baseUrl = process.argv[2] ?? DEFAULT_BASE_URL;
  const reportSlug = baseUrl.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  const reportRoot = path.join(ROOT, "reports", `legacy-newsite-audit-playwright-${reportSlug}`);
  const legacyPages = await loadLegacyPages();
  await mkdir(reportRoot, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  const results: AuditRow[] = [];

  try {
    for (const legacyPage of legacyPages) {
      const newUrl = `${baseUrl.replace(/\/$/, "")}${legacyPage.oldPath}`;
      let statusCode = 0;
      let titleNew = "";
      let renderedText = "";

      try {
        const response = await page.goto(newUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
        statusCode = response?.status() ?? 0;
        await page.waitForTimeout(1500);
        const extracted = await page.evaluate(() => ({
          title: document.title.trim(),
          bodyText: document.body?.innerText?.replace(/\n{3,}/g, "\n\n").trim() ?? "",
        }));
        titleNew = extracted.title;
        renderedText = extracted.bodyText;
      } catch (error) {
        results.push({
          oldUrl: legacyPage.oldUrl,
          oldPath: legacyPage.oldPath,
          newUrl,
          statusCode,
          titleOld: legacyPage.title,
          titleNew: "",
          oldWordCount: legacyPage.oldWordCount,
          newWordCount: 0,
          oldLineCount: legacyPage.lines.length,
          matchedLineCount: 0,
          lineCoverage: 0,
          missingLines: legacyPage.lines.slice(0, 12),
          notes: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      const normalizedRendered = normalizeLine(renderedText);
      const matchedLines = legacyPage.lines.filter((line) => normalizedRendered.includes(normalizeLine(line)));
      const missingLines = legacyPage.lines.filter((line) => !normalizedRendered.includes(normalizeLine(line)));
      const lineCoverage = Number((matchedLines.length / Math.max(legacyPage.lines.length, 1)).toFixed(3));

      results.push({
        oldUrl: legacyPage.oldUrl,
        oldPath: legacyPage.oldPath,
        newUrl,
        statusCode,
        titleOld: legacyPage.title,
        titleNew,
        oldWordCount: legacyPage.oldWordCount,
        newWordCount: renderedText.match(/\b\w+\b/g)?.length ?? 0,
        oldLineCount: legacyPage.lines.length,
        matchedLineCount: matchedLines.length,
        lineCoverage,
        missingLines: missingLines.slice(0, 12),
        notes:
          statusCode !== 200
            ? "Route does not currently resolve on the new site"
            : lineCoverage >= 0.8
              ? "Strong copy coverage"
              : lineCoverage >= 0.4
                ? "Partial copy coverage"
                : "Low copy coverage",
      });
      process.stdout.write(`${legacyPage.index}/${legacyPages.length} ${statusCode} ${legacyPage.oldPath} ${lineCoverage}\n`);
    }
  } finally {
    await page.close();
    await browser.close();
  }

  const summary = {
    baseUrl,
    pagesChecked: results.length,
    missingRoutes: results.filter((row) => row.statusCode !== 200).length,
    strongCoverage: results.filter((row) => row.statusCode === 200 && row.lineCoverage >= 0.8).length,
    partialCoverage: results.filter((row) => row.statusCode === 200 && row.lineCoverage >= 0.4 && row.lineCoverage < 0.8)
      .length,
    lowCoverage: results.filter((row) => row.statusCode === 200 && row.lineCoverage < 0.4).length,
  };

  const lowestCoverage = [...results]
    .filter((row) => row.statusCode === 200)
    .sort((a, b) => a.lineCoverage - b.lineCoverage)
    .slice(0, 40);

  const summaryMd = [
    "# Legacy to New Site Audit (Rendered)",
    "",
    `- Compared against: ${baseUrl}`,
    `- Total legacy HTML pages checked: ${summary.pagesChecked}`,
    `- Missing routes: ${summary.missingRoutes}`,
    `- Strong copy coverage: ${summary.strongCoverage}`,
    `- Partial copy coverage: ${summary.partialCoverage}`,
    `- Low copy coverage: ${summary.lowCoverage}`,
    "",
    "## Lowest Coverage Pages",
    "",
    ...lowestCoverage.flatMap((row) => [
      `- \`${row.oldPath}\` coverage \`${row.lineCoverage}\``,
      ...row.missingLines.slice(0, 5).map((line) => `  missing: ${line}`),
    ]),
    "",
  ].join("\n");

  await writeFile(path.join(reportRoot, "audit.json"), `${JSON.stringify({ summary, results }, null, 2)}\n`);
  await writeFile(path.join(reportRoot, "audit.csv"), toCsv(results));
  await writeFile(path.join(reportRoot, "SUMMARY.md"), summaryMd);

  process.stdout.write(`${JSON.stringify({ reportRoot, summary }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
