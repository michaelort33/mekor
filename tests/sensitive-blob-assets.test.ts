import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  SENSITIVE_BLOB_KEYS,
  SENSITIVE_PUBLIC_BLOB_URLS,
  isSensitiveFormInquiryAsset,
} from "../lib/blob/sensitive-assets";

const ROOT = path.resolve(process.cwd());

const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".next",
  "output",
  "coverage",
  ".worktrees",
]);

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx|js|mjs|cjs|json|csv|md|txt)$/i.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

test("isSensitiveFormInquiryAsset detects inquiry CSV sources", () => {
  assert.equal(
    isSensitiveFormInquiryAsset(
      "local:///Users/meshulumort/Documents/mekor/rebuild-assets/raw2/Mekor Assests/Forms Inquiries csv/Home Contact Form.csv",
    ),
    true,
  );
  assert.equal(isSensitiveFormInquiryAsset(SENSITIVE_PUBLIC_BLOB_URLS[1]), true);
  assert.equal(isSensitiveFormInquiryAsset("public/images/logo.png"), false);
});

test("repo does not advertise public sensitive inquiry Blob URLs", () => {
  const allowlist = new Set([
    path.join(ROOT, "lib/blob/sensitive-assets.ts"),
    path.join(ROOT, "scripts/blob/delete-sensitive-inquiry-blobs.ts"),
    path.join(ROOT, "tests/sensitive-blob-assets.test.ts"),
  ]);

  const offenders: string[] = [];
  for (const file of walkFiles(ROOT)) {
    if (allowlist.has(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const url of SENSITIVE_PUBLIC_BLOB_URLS) {
      if (text.includes(url)) {
        offenders.push(`${path.relative(ROOT, file)} -> ${url}`);
      }
    }
    for (const key of SENSITIVE_BLOB_KEYS) {
      if (text.includes(key)) {
        offenders.push(`${path.relative(ROOT, file)} -> ${key}`);
      }
    }
  }

  assert.deepEqual(offenders, []);
});
