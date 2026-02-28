import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { rewriteSrcsetValue, sanitizeMirrorHtml } from "../lib/mirror/html-security";

type RouteRecord = {
  path: string;
  sourceUrl: string;
};

type StatusOverrideRecord = {
  path: string;
  status: number;
};

type ContentIndexRecord = {
  path: string;
  type: string;
  file: string;
};

async function readJsonFile<T>(relativePath: string) {
  const filePath = path.join(process.cwd(), relativePath);
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

test("route contract: all HTML 200 routes map to content documents", async () => {
  const [htmlRoutes, index] = await Promise.all([
    readJsonFile<RouteRecord[]>("mirror-data/routes/html-200.json"),
    readJsonFile<ContentIndexRecord[]>("mirror-data/content/index.json"),
  ]);

  const indexedPaths = new Set(index.map((record) => record.path));
  const missingPaths = htmlRoutes
    .map((record) => record.path)
    .filter((pathValue) => !indexedPaths.has(pathValue));

  assert.equal(
    missingPaths.length,
    0,
    `Missing content documents for HTML routes: ${missingPaths.slice(0, 8).join(", ")}`,
  );
});

test("route contract: non-200 overrides do not collide with 200 routes", async () => {
  const [canonical, reachable, overrides] = await Promise.all([
    readJsonFile<RouteRecord[]>("mirror-data/routes/canonical-200.json"),
    readJsonFile<RouteRecord[]>("mirror-data/routes/reachable-extra-200.json"),
    readJsonFile<StatusOverrideRecord[]>("mirror-data/routes/status-overrides.json"),
  ]);

  const known200 = new Set([...canonical, ...reachable].map((record) => record.path));
  const collisions = overrides
    .filter((record) => record.status !== 200 && known200.has(record.path))
    .map((record) => record.path);

  assert.equal(
    collisions.length,
    0,
    `Status collisions found for 200 routes: ${collisions.slice(0, 8).join(", ")}`,
  );
});

test("asset rewrite: srcset URLs are rewritten candidate-by-candidate", () => {
  const source = [
    "https://static.wixstatic.com/media/a.jpg/v1/fill/w_120,h_80,al_c,q_85/file.jpg 1x",
    "https://static.wixstatic.com/media/a.jpg/v1/fill/w_240,h_160,al_c,q_85/file.jpg 2x",
  ].join(", ");

  let counter = 0;
  const output = rewriteSrcsetValue(source, () => {
    counter += 1;
    return `https://blob.example/asset-${counter}.jpg`;
  });

  assert.match(output, /^https:\/\/blob\.example\//);
  assert.equal(output.includes(" 1x"), true);
  assert.equal(output.includes(" 2x"), true);
  assert.equal(output.includes("static.wixstatic.com"), false);
});

test("html sanitization: inline handlers and javascript URLs are removed", () => {
  const dirtyHtml = `
    <div onclick="alert(1)">
      <a href="javascript:alert(1)" onmouseover="alert(2)">click</a>
      <img src="https://example.com/p.png" onerror="alert(3)" />
      <script>alert(4)</script>
    </div>
  `;

  const cleanHtml = sanitizeMirrorHtml(dirtyHtml);

  assert.equal(cleanHtml.includes("onclick"), false);
  assert.equal(cleanHtml.includes("onmouseover"), false);
  assert.equal(cleanHtml.includes("onerror"), false);
  assert.equal(cleanHtml.includes("javascript:"), false);
  assert.equal(cleanHtml.includes("<script"), false);
});
