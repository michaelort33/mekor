import fs from "node:fs/promises";
import path from "node:path";

import { CONTENT_DIR, ROUTES_DIR, SEARCH_DIR, ensureMirrorDirs } from "./_shared";

type RouteRecord = { path: string; sourceUrl: string };
type StatusOverride = { path: string; status: number };

type ContentIndexRecord = { path: string; type: string; file: string };

async function readJson<T>(filePath: string, fallback: T) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function main() {
  await ensureMirrorDirs();

  const [canonical, reachableExtra, htmlRoutes, fileRoutes, statusOverrides, aliases, contentIndex, searchIndex] =
    await Promise.all([
      readJson<RouteRecord[]>(path.join(ROUTES_DIR, "canonical-200.json"), []),
      readJson<RouteRecord[]>(path.join(ROUTES_DIR, "reachable-extra-200.json"), []),
      readJson<RouteRecord[]>(path.join(ROUTES_DIR, "html-200.json"), []),
      readJson<RouteRecord[]>(path.join(ROUTES_DIR, "file-200.json"), []),
      readJson<StatusOverride[]>(path.join(ROUTES_DIR, "status-overrides.json"), []),
      readJson<Array<{ from: string; to: string }>>(path.join(ROUTES_DIR, "aliases.json"), []),
      readJson<ContentIndexRecord[]>(path.join(CONTENT_DIR, "index.json"), []),
      readJson<Array<{ path: string }>>(path.join(SEARCH_DIR, "index.json"), []),
    ]);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (canonical.length !== 177) {
    warnings.push(`canonical route count is ${canonical.length} (expected baseline 177)`);
  }

  if (reachableExtra.length < 60) {
    warnings.push(`reachable extra route count is low: ${reachableExtra.length}`);
  }

  const known200 = new Set([...canonical, ...reachableExtra].map((record) => record.path));
  const contentPaths = new Set(contentIndex.map((record) => record.path));

  const missingContent = htmlRoutes
    .map((record) => record.path)
    .filter((pathValue) => !contentPaths.has(pathValue));

  if (missingContent.length > 0) {
    warnings.push(`missing content docs for ${missingContent.length} HTML routes`);
  }

  for (const override of statusOverrides) {
    if (known200.has(override.path) && override.status !== 200) {
      errors.push(`path ${override.path} exists in 200 set and status override set`);
    }
  }

  for (const alias of aliases) {
    if (!known200.has(alias.to)) {
      warnings.push(`alias target missing in 200 set: ${alias.to}`);
    }
  }

  if (searchIndex.length === 0) {
    errors.push("search index is empty");
  }

  if (fileRoutes.length === 0) {
    warnings.push("file-200 routes are empty");
  }

  console.log(`canonical=${canonical.length}`);
  console.log(`reachable_extra=${reachableExtra.length}`);
  console.log(`status_overrides=${statusOverrides.length}`);
  console.log(`aliases=${aliases.length}`);
  console.log(`html_routes=${htmlRoutes.length}`);
  console.log(`file_routes=${fileRoutes.length}`);
  console.log(`content_docs=${contentIndex.length}`);
  console.log(`search_records=${searchIndex.length}`);

  if (warnings.length > 0) {
    console.warn("warnings:");
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error("errors:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
