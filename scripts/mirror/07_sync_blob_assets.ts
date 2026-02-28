import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { head, put } from "@vercel/blob";
import dotenv from "dotenv";

import {
  ASSETS_DIR,
  ensureMirrorDirs,
  guessContentTypeFromName,
  parseSiteUrl,
  writeJson,
} from "./_shared";

dotenv.config({ path: ".env.local" });
dotenv.config();

type AssetCandidate = {
  sourceType: "zip" | "snapshot";
  sourceUrl: string;
  localPath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  sha1: string;
  contentType?: string;
};

type BlobMapRecord = {
  sourceUrl: string;
  path: string;
  blobKey: string;
  blobUrl: string;
  contentType: string;
  sha1: string;
  size: number;
};

function sanitizeFilename(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "") || "asset";
}

async function computeHash(buffer: Buffer) {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

async function fetchRemoteBuffer(urlValue: string) {
  const response = await fetch(urlValue, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`failed download ${urlValue}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  await ensureMirrorDirs();

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for blob sync");
  }

  const dryRun = process.env.MIRROR_BLOB_DRY_RUN === "1";
  const limitRaw = process.env.MIRROR_BLOB_LIMIT;
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : Number.MAX_SAFE_INTEGER;

  const candidates = JSON.parse(
    await fs.readFile(path.join(ASSETS_DIR, "asset-candidates.json"), "utf8"),
  ) as AssetCandidate[];

  const selectedCandidates = candidates.slice(0, Number.isFinite(limit) ? limit : Number.MAX_SAFE_INTEGER);

  const uploadedBySha = new Map<string, { key: string; url: string; size: number; contentType: string }>();
  const mapRecords: BlobMapRecord[] = [];
  const failures: Array<{ sourceUrl: string; error: string }> = [];

  for (const candidate of selectedCandidates) {
    const sourceLabel = candidate.sourceUrl || candidate.localPath;

    try {
      let buffer: Buffer;

      if (candidate.localPath) {
        buffer = await fs.readFile(candidate.localPath);
      } else if (candidate.sourceUrl) {
        buffer = await fetchRemoteBuffer(candidate.sourceUrl);
      } else {
        throw new Error("candidate has no localPath or sourceUrl");
      }

      const sha1 = candidate.sha1 || (await computeHash(buffer));
      const filename = sanitizeFilename(candidate.filename || "asset");
      const blobKey = `mekor/${sha1}-${filename}`;
      const contentType = candidate.contentType || guessContentTypeFromName(filename);

      if (!uploadedBySha.has(sha1)) {
        if (dryRun) {
          uploadedBySha.set(sha1, {
            key: blobKey,
            url: `https://blob.local/${blobKey}`,
            size: buffer.byteLength,
            contentType,
          });
        } else {
          try {
            const result = await put(blobKey, buffer, {
              access: "public",
              token,
              addRandomSuffix: false,
              contentType,
            });

            uploadedBySha.set(sha1, {
              key: blobKey,
              url: result.url,
              size: buffer.byteLength,
              contentType,
            });
          } catch (error) {
            const message = String(error);
            if (message.includes("already exists")) {
              const blob = await head(blobKey, { token });
              uploadedBySha.set(sha1, {
                key: blobKey,
                url: blob.url,
                size: blob.size,
                contentType: blob.contentType || contentType,
              });
            } else {
              throw error;
            }
          }
        }
      }

      const uploaded = uploadedBySha.get(sha1);
      if (!uploaded) {
        throw new Error("upload map missing after upload");
      }

      const parsedPath = candidate.sourceUrl ? parseSiteUrl(candidate.sourceUrl) : null;

      mapRecords.push({
        sourceUrl: candidate.sourceUrl || `local://${candidate.localPath}`,
        path: parsedPath ?? "",
        blobKey: uploaded.key,
        blobUrl: uploaded.url,
        contentType: uploaded.contentType,
        sha1,
        size: uploaded.size,
      });

      const processed = mapRecords.length + failures.length;
      if (processed % 25 === 0 || processed === selectedCandidates.length) {
        console.log(`blob_sync_progress=${processed}/${selectedCandidates.length}`);
      }
    } catch (error) {
      failures.push({
        sourceUrl: sourceLabel,
        error: String(error),
      });

      const processed = mapRecords.length + failures.length;
      if (processed % 25 === 0 || processed === selectedCandidates.length) {
        console.log(`blob_sync_progress=${processed}/${selectedCandidates.length}`);
      }
    }
  }

  mapRecords.sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));

  await Promise.all([
    writeJson(path.join(ASSETS_DIR, "blob-map.json"), mapRecords),
    writeJson(path.join(ASSETS_DIR, "blob-failures.json"), failures),
    writeJson(path.join(ASSETS_DIR, "blob-summary.json"), {
      generatedAt: new Date().toISOString(),
      candidateCount: selectedCandidates.length,
      uploadedUniqueCount: uploadedBySha.size,
      mappedCount: mapRecords.length,
      failureCount: failures.length,
      dryRun,
    }),
  ]);

  console.log(`blob_mapped=${mapRecords.length}`);
  console.log(`blob_failures=${failures.length}`);
  console.log(`blob_unique_uploads=${uploadedBySha.size}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
