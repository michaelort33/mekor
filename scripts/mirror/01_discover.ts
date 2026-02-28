import path from "node:path";

import {
  ensureMirrorDirs,
  isLikelyFilePath,
  normalizePath,
  parseSiteUrl,
  readCsv,
  readLines,
  toAbsoluteUrl,
  writeJson,
  ROUTES_DIR,
  REPO_ROOT,
} from "./_shared";

type RouteContractRecord = {
  path: string;
  sourceUrl: string;
};

type StatusOverrideRecord = {
  path: string;
  status: number;
  sourceUrl: string;
};

type AliasRecord = {
  from: string;
  to: string;
  reason: string;
};

function chooseCanonicalPath(candidates: string[]) {
  return candidates
    .slice()
    .sort((a, b) => {
      const aLower = a === a.toLowerCase() ? 0 : 1;
      const bLower = b === b.toLowerCase() ? 0 : 1;
      if (aLower !== bLower) return aLower - bLower;

      const aEncoded = /%[0-9A-Fa-f]{2}/.test(a) ? 0 : 1;
      const bEncoded = /%[0-9A-Fa-f]{2}/.test(b) ? 0 : 1;
      if (aEncoded !== bEncoded) return aEncoded - bEncoded;

      return a.localeCompare(b);
    })[0];
}

function recordFromPath(pathValue: string): RouteContractRecord {
  return {
    path: normalizePath(pathValue),
    sourceUrl: toAbsoluteUrl(pathValue),
  };
}

async function main() {
  await ensureMirrorDirs();

  const sitemapFile = path.join(REPO_ROOT, "mekorhabracha_sitemap_urls.txt");
  const reachableFile = path.join(
    REPO_ROOT,
    "mekorhabracha_public_urls_2026-02-28_playwright_clean_reachable.txt",
  );
  const nonOkFile = path.join(
    REPO_ROOT,
    "mekorhabracha_public_urls_2026-02-28_playwright_clean_non_ok.txt",
  );
  const statusCsvFile = path.join(
    REPO_ROOT,
    "mekorhabracha_public_urls_2026-02-28_playwright_status.csv",
  );

  const [sitemapLines, reachableLines, nonOkLines, statusRows] = await Promise.all([
    readLines(sitemapFile),
    readLines(reachableFile),
    readLines(nonOkFile),
    readCsv(statusCsvFile),
  ]);

  const canonicalPathSet = new Set<string>();
  for (const line of sitemapLines) {
    const parsed = parseSiteUrl(line);
    if (parsed) {
      canonicalPathSet.add(parsed);
    }
  }

  const reachablePathSet = new Set<string>();
  for (const line of reachableLines) {
    const parsed = parseSiteUrl(line);
    if (parsed) {
      reachablePathSet.add(parsed);
    }
  }

  const nonOkPathSet = new Set<string>();
  for (const line of nonOkLines) {
    const parsed = parseSiteUrl(line);
    if (parsed) {
      nonOkPathSet.add(parsed);
    }
  }

  const statusByPath = new Map<string, number>();
  for (const row of statusRows) {
    const rawUrl = row.url ?? "";
    const parsed = parseSiteUrl(rawUrl);
    if (!parsed) {
      continue;
    }

    const statusRaw = (row.status ?? "").trim();
    const status = Number.parseInt(statusRaw, 10);
    if (!Number.isFinite(status)) {
      continue;
    }

    statusByPath.set(parsed, status);
  }

  const reachableExtraPaths = [...reachablePathSet].filter((pathValue) => !canonicalPathSet.has(pathValue));

  const canonical = [...canonicalPathSet].sort().map(recordFromPath);
  const reachableExtra = reachableExtraPaths.sort().map(recordFromPath);

  const statusOverrides: StatusOverrideRecord[] = [...nonOkPathSet]
    .sort()
    .map((pathValue) => ({
      path: pathValue,
      status: statusByPath.get(pathValue) ?? 404,
      sourceUrl: toAbsoluteUrl(pathValue),
    }))
    .filter((record) => record.status !== 200);

  const allTwoHundredPaths = [...new Set([...canonicalPathSet, ...reachableExtraPaths])];
  const htmlTwoHundred = allTwoHundredPaths
    .filter((pathValue) => !isLikelyFilePath(pathValue))
    .sort();
  const fileTwoHundred = allTwoHundredPaths
    .filter((pathValue) => isLikelyFilePath(pathValue))
    .sort();

  const aliasGroups = new Map<string, string[]>();
  for (const pathValue of allTwoHundredPaths) {
    const clean = normalizePath(pathValue);
    const pathname = clean.split("?")[0];

    let key = pathname.toLowerCase();
    try {
      key = decodeURIComponent(pathname).toLowerCase();
    } catch {
      key = pathname.toLowerCase();
    }

    const current = aliasGroups.get(key) ?? [];
    current.push(pathname);
    aliasGroups.set(key, current);
  }

  const aliases: AliasRecord[] = [];
  for (const candidates of aliasGroups.values()) {
    const unique = [...new Set(candidates)].sort();
    if (unique.length < 2) {
      continue;
    }

    const canonicalPath = chooseCanonicalPath(unique);

    for (const candidate of unique) {
      if (candidate === canonicalPath) {
        continue;
      }

      aliases.push({
        from: candidate,
        to: canonicalPath,
        reason: "case-or-encoding-variant",
      });
    }
  }

  aliases.sort((a, b) => a.from.localeCompare(b.from));

  await Promise.all([
    writeJson(path.join(ROUTES_DIR, "canonical-200.json"), canonical),
    writeJson(path.join(ROUTES_DIR, "reachable-extra-200.json"), reachableExtra),
    writeJson(path.join(ROUTES_DIR, "status-overrides.json"), statusOverrides),
    writeJson(path.join(ROUTES_DIR, "aliases.json"), aliases),
    writeJson(
      path.join(ROUTES_DIR, "html-200.json"),
      htmlTwoHundred.map((pathValue) => recordFromPath(pathValue)),
    ),
    writeJson(
      path.join(ROUTES_DIR, "file-200.json"),
      fileTwoHundred.map((pathValue) => recordFromPath(pathValue)),
    ),
    writeJson(path.join(ROUTES_DIR, "status-by-path.json"),
      [...statusByPath.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([pathValue, status]) => ({ path: pathValue, status })),
    ),
    writeJson(path.join(ROUTES_DIR, "discovery-summary.json"), {
      generatedAt: new Date().toISOString(),
      canonicalCount: canonical.length,
      reachableExtraCount: reachableExtra.length,
      statusOverrideCount: statusOverrides.length,
      aliasCount: aliases.length,
      htmlTwoHundredCount: htmlTwoHundred.length,
      fileTwoHundredCount: fileTwoHundred.length,
    }),
  ]);

  console.log(`canonical=${canonical.length}`);
  console.log(`reachable_extra=${reachableExtra.length}`);
  console.log(`status_overrides=${statusOverrides.length}`);
  console.log(`aliases=${aliases.length}`);
  console.log(`html_200=${htmlTwoHundred.length}`);
  console.log(`file_200=${fileTwoHundred.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
