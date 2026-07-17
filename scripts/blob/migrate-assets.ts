// Migrate assets (remote URLs or local public/ files) into Vercel Blob.
//
// Usage:
//   tsx scripts/blob/migrate-assets.ts <pending.json> <out-map.json>
//
// <pending.json> is an array of source strings (http(s) URLs or repo-relative
// paths like "public/images/foo.png"). The script downloads/reads each asset,
// uploads it to Blob under "mekor/<sha1>-<filename>" (matching the mirror
// convention), skips ones already present, and writes a { source: blobUrl } map.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { head, put } from "@vercel/blob";
import dotenv from "dotenv";

import { isSensitiveFormInquiryAsset } from "@/lib/blob/sensitive-assets";

dotenv.config({ path: ".env.local" });
dotenv.config();

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
};

function contentTypeFor(filename: string) {
  return CONTENT_TYPES[path.extname(filename).toLowerCase()] || "application/octet-stream";
}

function sanitizeFilename(name: string) {
  const decoded = (() => {
    try {
      return decodeURIComponent(name);
    } catch {
      return name;
    }
  })();
  const cleaned = decoded.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "asset";
}

function filenameFromSource(source: string) {
  if (/^https?:\/\//i.test(source)) {
    const url = new URL(source);
    const last = url.pathname.split("/").filter(Boolean).pop() || "asset";
    // Wix transform URLs end in the original filename; keep extension if missing.
    return sanitizeFilename(last);
  }
  return sanitizeFilename(path.basename(source));
}

async function bytesFor(source: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(source)) {
    // Encode spaces and other unsafe chars (some Wix URLs contain literal spaces).
    const fetchUrl = encodeURI(source);
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      throw new Error(`fetch ${res.status} for ${source}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(source);
}

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required");
  }

  const pendingPath = process.argv[2];
  const outPath = process.argv[3];
  if (!pendingPath || !outPath) {
    throw new Error("Usage: migrate-assets.ts <pending.json> <out-map.json>");
  }

  const sources: string[] = JSON.parse(await fs.readFile(pendingPath, "utf8"));
  const existing: Record<string, string> = await fs
    .readFile(outPath, "utf8")
    .then((raw) => JSON.parse(raw))
    .catch(() => ({}));

  const map: Record<string, string> = { ...existing };
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const source of sources) {
    if (isSensitiveFormInquiryAsset(source)) {
      if (map[source]) {
        delete map[source];
        console.warn(`removed sensitive mapping (will not re-upload): ${source}`);
      } else {
        console.warn(`skipping sensitive form inquiry asset: ${source}`);
      }
      skipped++;
      continue;
    }
    if (map[source]) {
      skipped++;
      continue;
    }
    try {
      const buffer = await bytesFor(source);
      const sha1 = crypto.createHash("sha1").update(buffer).digest("hex");
      let filename = filenameFromSource(source);
      if (!path.extname(filename)) {
        filename = `${filename}.bin`;
      }
      const blobKey = `mekor/${sha1}-${filename}`;
      const contentType = contentTypeFor(filename);

      let blobUrl: string;
      try {
        const existingBlob = await head(blobKey, { token });
        blobUrl = existingBlob.url;
      } catch {
        const result = await put(blobKey, buffer, {
          access: "public",
          token,
          addRandomSuffix: false,
          contentType,
        });
        blobUrl = result.url;
        uploaded++;
      }
      map[source] = blobUrl;
      console.log(`ok  ${source}\n  -> ${blobUrl}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${source}: ${(error as Error).message}`);
    }
  }

  await fs.writeFile(outPath, JSON.stringify(map, null, 2) + "\n");
  console.log(`\nDone. uploaded=${uploaded} skipped=${skipped} failed=${failed} total=${Object.keys(map).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
