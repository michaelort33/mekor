import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

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

type PageDiff = {
  oldPath: string;
  oldUrl: string;
  newUrl: string;
  titleOld: string;
  titleNew: string;
  lineCoverage: number;
  exactMatches: number;
  changedPhrases: Array<{
    oldText: string;
    newText: string;
    similarity: number;
  }>;
  removedPhrases: string[];
  addedPhrases: string[];
};

const ROOT = process.cwd();
const LEGACY_EXPORT_ROOT = path.join(ROOT, "output", "mekorhabracha-site-export-2026-03-09");

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

function diceSimilarity(a: string, b: string) {
  const tokenize = (value: string) => normalizeLine(value).split(" ").filter(Boolean);
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (!aTokens.length || !bTokens.length) {
    return 0;
  }
  const aCounts = new Map<string, number>();
  for (const token of aTokens) {
    aCounts.set(token, (aCounts.get(token) ?? 0) + 1);
  }
  let overlap = 0;
  for (const token of bTokens) {
    const count = aCounts.get(token) ?? 0;
    if (count > 0) {
      overlap += 1;
      aCounts.set(token, count - 1);
    }
  }
  return (2 * overlap) / (aTokens.length + bTokens.length);
}

async function main() {
  const auditPath = process.argv[2];
  if (!auditPath) {
    throw new Error("Usage: npx tsx scripts/review/high_coverage_wording_diff.ts <audit-json-path>");
  }

  const reportRoot = path.join(path.dirname(auditPath), "wording-diff");
  await mkdir(reportRoot, { recursive: true });

  const audit = JSON.parse(await readFile(auditPath, "utf8")) as { summary: unknown; results: AuditRow[] };
  const candidates = audit.results.filter((row) => row.lineCoverage >= 0.8 && row.statusCode === 200);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  const diffs: PageDiff[] = [];

  try {
    for (const row of candidates) {
      const legacyFolder = path.join(
        LEGACY_EXPORT_ROOT,
        `${String(audit.results.findIndex((item) => item.oldPath === row.oldPath) + 1).padStart(3, "0")}`,
      );
      const manifest = JSON.parse(await readFile(path.join(LEGACY_EXPORT_ROOT, "manifest.json"), "utf8")) as Array<{
        index: number;
        outputDir: string;
        url: string;
      }>;
      const legacyRecord = manifest.find((item) => item.url === row.oldUrl);
      if (!legacyRecord) {
        continue;
      }

      const legacyMarkdown = await readFile(path.join(legacyRecord.outputDir, "content.md"), "utf8");
      const oldLines = significantLines(extractBodyText(legacyMarkdown));

      await page.goto(row.newUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(1200);
      const extracted = await page.evaluate(() => ({
        bodyText: document.body?.innerText?.replace(/\n{3,}/g, "\n\n").trim() ?? "",
      }));
      const newLines = significantLines(extracted.bodyText);
      const usedNew = new Set<number>();
      const changedPhrases: PageDiff["changedPhrases"] = [];
      const removedPhrases: string[] = [];
      let exactMatches = 0;

      for (const oldLine of oldLines) {
        const oldNorm = normalizeLine(oldLine);
        let exactIndex = -1;
        for (let i = 0; i < newLines.length; i += 1) {
          if (usedNew.has(i)) continue;
          if (normalizeLine(newLines[i]) === oldNorm) {
            exactIndex = i;
            break;
          }
        }
        if (exactIndex >= 0) {
          usedNew.add(exactIndex);
          exactMatches += 1;
          continue;
        }

        let bestIndex = -1;
        let bestScore = 0;
        for (let i = 0; i < newLines.length; i += 1) {
          if (usedNew.has(i)) continue;
          const score = diceSimilarity(oldLine, newLines[i]);
          if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }

        if (bestIndex >= 0 && bestScore >= 0.55) {
          usedNew.add(bestIndex);
          changedPhrases.push({
            oldText: oldLine,
            newText: newLines[bestIndex],
            similarity: Number(bestScore.toFixed(3)),
          });
        } else {
          removedPhrases.push(oldLine);
        }
      }

      const addedPhrases = newLines.filter((_, index) => !usedNew.has(index)).slice(0, 12);
      diffs.push({
        oldPath: row.oldPath,
        oldUrl: row.oldUrl,
        newUrl: row.newUrl,
        titleOld: row.titleOld,
        titleNew: row.titleNew,
        lineCoverage: row.lineCoverage,
        exactMatches,
        changedPhrases: changedPhrases.slice(0, 12),
        removedPhrases: removedPhrases.slice(0, 12),
        addedPhrases,
      });
      process.stdout.write(`${row.oldPath} exact=${exactMatches} changed=${changedPhrases.length} removed=${removedPhrases.length}\n`);
      void legacyFolder;
    }
  } finally {
    await page.close();
    await browser.close();
  }

  const markdown = [
    "# High Coverage Wording Diff",
    "",
    `- Source audit: ${auditPath}`,
    `- Pages included: ${diffs.length}`,
    "",
    ...diffs.flatMap((diff) => [
      `## ${diff.oldPath}`,
      "",
      `- Old URL: ${diff.oldUrl}`,
      `- New URL: ${diff.newUrl}`,
      `- Old title: ${diff.titleOld}`,
      `- New title: ${diff.titleNew}`,
      `- Coverage: ${diff.lineCoverage}`,
      `- Exact phrase matches: ${diff.exactMatches}`,
      "",
      "### Changed Wording",
      "",
      ...(diff.changedPhrases.length
        ? diff.changedPhrases.flatMap((change) => [
            `- old: ${change.oldText}`,
            `  new: ${change.newText}`,
            `  similarity: ${change.similarity}`,
          ])
        : ["- None"]),
      "",
      "### Removed From New Page",
      "",
      ...(diff.removedPhrases.length ? diff.removedPhrases.map((line) => `- ${line}`) : ["- None"]),
      "",
      "### Added On New Page",
      "",
      ...(diff.addedPhrases.length ? diff.addedPhrases.map((line) => `- ${line}`) : ["- None"]),
      "",
    ]),
  ].join("\n");

  await writeFile(path.join(reportRoot, "wording-diff.json"), `${JSON.stringify(diffs, null, 2)}\n`);
  await writeFile(path.join(reportRoot, "wording-diff.md"), `${markdown}\n`);
  process.stdout.write(`${JSON.stringify({ reportRoot, pages: diffs.length }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
