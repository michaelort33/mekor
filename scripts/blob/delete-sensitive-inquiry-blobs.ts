/**
 * Delete publicly exposed form-inquiry CSV blobs.
 *
 * Usage:
 *   npx tsx scripts/blob/delete-sensitive-inquiry-blobs.ts
 *
 * Requires BLOB_READ_WRITE_TOKEN.
 */

import { config as loadEnv } from "dotenv";
import { del, head } from "@vercel/blob";

import { SENSITIVE_BLOB_KEYS, SENSITIVE_PUBLIC_BLOB_URLS } from "@/lib/blob/sensitive-assets";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required to delete sensitive inquiry blobs");
  }

  for (const key of SENSITIVE_BLOB_KEYS) {
    try {
      await head(key, { token });
      await del(key, { token });
      console.log(`deleted ${key}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/not found|404/i.test(message)) {
        console.log(`already gone ${key}`);
        continue;
      }
      // Also try URL form for older SDK/token behaviors.
      const url = SENSITIVE_PUBLIC_BLOB_URLS.find((candidate) => candidate.endsWith(key.split("/").pop() || ""));
      if (url) {
        try {
          await del(url, { token });
          console.log(`deleted via url ${url}`);
          continue;
        } catch {
          // fall through
        }
      }
      throw error;
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
