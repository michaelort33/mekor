import fs from "node:fs/promises";
import path from "node:path";

import {
  ASSETS_DIR,
  REPO_ROOT,
  SNAPSHOT_DIR,
  ensureMirrorDirs,
  guessContentTypeFromName,
  readCsv,
  writeJson,
} from "./_shared";

type SnapshotRecord = {
  path: string;
  assets: string[];
  links: string[];
};

type AssetCandidate = {
  sourceType: "zip" | "snapshot";
  sourceUrl: string;
  localPath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  sha1: string;
  contentType: string;
};

function getExtension(name: string) {
  const parsed = path.extname(name).toLowerCase();
  return parsed || "";
}

function getFilenameFromUrl(urlValue: string) {
  try {
    const parsed = new URL(urlValue);
    const base = path.basename(parsed.pathname);
    return base || "asset";
  } catch {
    return "asset";
  }
}

async function loadSnapshots() {
  const files = (await fs.readdir(SNAPSHOT_DIR)).filter((file) => file.endsWith(".json"));
  const snapshots: SnapshotRecord[] = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(SNAPSHOT_DIR, file), "utf8");
      snapshots.push(JSON.parse(content) as SnapshotRecord);
    } catch {
      // keep going for malformed snapshot files
    }
  }

  return snapshots;
}

async function main() {
  await ensureMirrorDirs();

  const inventoryPath = path.join(REPO_ROOT, "rebuild-assets/planning/assets_inventory.csv");
  const inventory = await readCsv(inventoryPath);
  const snapshots = await loadSnapshots();
  const fileRouteRecords = JSON.parse(
    await fs.readFile(path.join(REPO_ROOT, "mirror-data/routes/file-200.json"), "utf8"),
  ) as Array<{ path: string; sourceUrl: string }>;

  const localCandidates: AssetCandidate[] = inventory.map((row) => {
    const localPath = row.absolute_path ?? "";
    const filename = row.filename ?? path.basename(localPath || row.relative_path || "asset");

    return {
      sourceType: "zip",
      sourceUrl: "",
      localPath,
      filename,
      extension: row.extension || getExtension(filename),
      sizeBytes: Number.parseInt(row.size_bytes || "0", 10) || 0,
      sha1: row.sha1 || "",
      contentType: guessContentTypeFromName(filename),
    };
  });

  const snapshotAssetUrls = new Set<string>();
  for (const snapshot of snapshots) {
    for (const asset of snapshot.assets ?? []) {
      try {
        const parsed = new URL(asset);
        const lowerPath = parsed.pathname.toLowerCase();

        if (
          parsed.hostname.endsWith("mekorhabracha.org") ||
          parsed.hostname.endsWith("wixstatic.com") ||
          parsed.hostname.endsWith("filesusr.com")
        ) {
          if (/\.(png|jpe?g|gif|webp|svg|pdf|docx?|mp4|webm|xml|txt)$/i.test(lowerPath) || lowerPath.includes("/_files/")) {
            snapshotAssetUrls.add(asset);
          }
        }
      } catch {
        // ignore invalid URLs
      }
    }
  }

  for (const record of fileRouteRecords) {
    if (record.sourceUrl) {
      snapshotAssetUrls.add(record.sourceUrl);
    } else if (record.path) {
      snapshotAssetUrls.add(`https://www.mekorhabracha.org${record.path}`);
    }
  }

  const snapshotCandidates: AssetCandidate[] = [...snapshotAssetUrls]
    .sort()
    .map((urlValue) => {
      const filename = getFilenameFromUrl(urlValue);
      return {
        sourceType: "snapshot",
        sourceUrl: urlValue,
        localPath: "",
        filename,
        extension: getExtension(filename),
        sizeBytes: 0,
        sha1: "",
        contentType: guessContentTypeFromName(filename),
      };
    });

  const combined = [...localCandidates, ...snapshotCandidates];

  const localNames = new Set(localCandidates.map((record) => record.filename.toLowerCase()));
  const remoteMissingFromZip = snapshotCandidates.filter(
    (record) => !localNames.has(record.filename.toLowerCase()),
  );

  await Promise.all([
    writeJson(path.join(ASSETS_DIR, "asset-candidates.json"), combined),
    writeJson(path.join(ASSETS_DIR, "snapshot-assets.json"), snapshotCandidates),
    writeJson(path.join(ASSETS_DIR, "remote-missing-from-zip.json"), remoteMissingFromZip),
    writeJson(path.join(ASSETS_DIR, "asset-summary.json"), {
      generatedAt: new Date().toISOString(),
      localCandidateCount: localCandidates.length,
      snapshotCandidateCount: snapshotCandidates.length,
      combinedCount: combined.length,
      remoteMissingFromZipCount: remoteMissingFromZip.length,
    }),
  ]);

  console.log(`local_candidates=${localCandidates.length}`);
  console.log(`snapshot_candidates=${snapshotCandidates.length}`);
  console.log(`remote_missing_from_zip=${remoteMissingFromZip.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
