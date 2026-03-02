import fs from "node:fs/promises";
import path from "node:path";

import { getManagedEvents } from "../../lib/events/store";
import { getManagedInTheNews } from "../../lib/in-the-news/store";
import { getManagedKosherPlaces } from "../../lib/kosher/store";
import { loadSearchIndex } from "../../lib/mirror/loaders";
import {
  MIRROR_ONLY_FIELD_LIFECYCLE,
  NATIVE_CONTRACT_MATRIX,
  NATIVE_ENABLED_ROUTE_PATHS,
  validateManagedEventsContract,
  validateManagedInTheNewsContract,
  validateManagedKosherPlacesContract,
  validateSearchIndexContract,
} from "../../lib/native/contracts";
import { ROUTES_DIR, ensureMirrorDirs } from "./_shared";

type RouteRecord = {
  path: string;
  sourceUrl: string;
};

type RouteLikeRecord = Record<string, unknown>;

const KOSHER_ROUTE_NEIGHBORHOOD: Record<string, string> = {
  "/center-city": "center-city",
  "/cherry-hill": "cherry-hill",
  "/main-line-manyunk": "main-line-manyunk",
  "/old-yorkroad-northeast": "old-yorkroad-northeast",
};

async function readJson<T>(filePath: string, fallback: T) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function collectMissingRequiredFields(
  rows: RouteLikeRecord[],
  requiredFields: readonly string[],
  scope: string,
) {
  const issues: string[] = [];

  if (rows.length === 0) {
    issues.push(`${scope}: dataset is empty`);
    return issues;
  }

  for (const field of requiredFields) {
    const missingIndexes = rows
      .map((row, index) => ({
        index,
        value: row[field],
      }))
      .filter(({ value }) => value === undefined || value === null)
      .map(({ index }) => index);

    if (missingIndexes.length > 0) {
      issues.push(
        `${scope}: missing required field '${field}' at indexes ${missingIndexes.slice(0, 8).join(", ")}`,
      );
      continue;
    }

    const emptyStringIndexes = rows
      .map((row, index) => ({
        index,
        value: row[field],
      }))
      .filter(({ value }) => typeof value === "string" && value.trim().length === 0)
      .map(({ index }) => index);

    if (emptyStringIndexes.length > 0) {
      issues.push(
        `${scope}: empty string in required field '${field}' at indexes ${emptyStringIndexes
          .slice(0, 8)
          .join(", ")}`,
      );
    }
  }

  return issues;
}

function assertMirrorOnlyFieldTracking() {
  const errors: string[] = [];
  const warnings: string[] = [];

  const expectedKeys = [
    "events:capturedAt",
    "events:sourceJson",
    "events:sourceCapturedAt",
    "in-the-news:capturedAt",
    "in-the-news:sourceJson",
    "in-the-news:sourceCapturedAt",
    "kosher:capturedAt",
    "kosher:sourceJson",
    "kosher:sourceCapturedAt",
  ];

  const actualKeys = MIRROR_ONLY_FIELD_LIFECYCLE.map((row) => `${row.dataset}:${row.field}`);
  const actualKeySet = new Set(actualKeys);

  for (const key of expectedKeys) {
    if (!actualKeySet.has(key)) {
      errors.push(`mirror-only field lifecycle entry missing: ${key}`);
    }
  }

  if (actualKeySet.size !== actualKeys.length) {
    errors.push("duplicate mirror-only field lifecycle records found");
  }

  for (const row of MIRROR_ONLY_FIELD_LIFECYCLE) {
    if (row.consumedBy.length === 0) {
      errors.push(`mirror-only field ${row.dataset}:${row.field} has no consumers listed`);
    }

    if (row.phase === "active") {
      warnings.push(
        `mirror-only field ${row.dataset}:${row.field} is still active and not yet deprecating`,
      );
    }
  }

  return { errors, warnings };
}

async function main() {
  await ensureMirrorDirs();

  const [canonical, reachable] = await Promise.all([
    readJson<RouteRecord[]>(path.join(ROUTES_DIR, "canonical-200.json"), []),
    readJson<RouteRecord[]>(path.join(ROUTES_DIR, "reachable-extra-200.json"), []),
  ]);

  const errors: string[] = [];
  const warnings: string[] = [];

  const nativeRoutesFromMatrix = new Set(NATIVE_CONTRACT_MATRIX.map((row) => row.routePath));
  const nativeRoutesFromConfig = new Set(NATIVE_ENABLED_ROUTE_PATHS);

  for (const routePath of nativeRoutesFromConfig) {
    if (!nativeRoutesFromMatrix.has(routePath)) {
      errors.push(`native-enabled route missing from contract matrix: ${routePath}`);
    }
  }

  for (const routePath of nativeRoutesFromMatrix) {
    if (!nativeRoutesFromConfig.has(routePath)) {
      errors.push(`contract matrix has non-enabled route: ${routePath}`);
    }
  }

  const known200 = new Set([...canonical, ...reachable].map((record) => record.path));
  for (const row of NATIVE_CONTRACT_MATRIX) {
    if (row.requiresMirrorRouteContract && !known200.has(row.routePath)) {
      errors.push(`native route ${row.routePath} is enabled but missing from mirror 200 route contract`);
    }
  }

  const events = validateManagedEventsContract(await getManagedEvents(), "native verify: events");
  const articles = validateManagedInTheNewsContract(
    await getManagedInTheNews(),
    "native verify: in-the-news",
  );
  const places = validateManagedKosherPlacesContract(
    await getManagedKosherPlaces(),
    "native verify: kosher",
  );
  const searchRecords = validateSearchIndexContract(
    await loadSearchIndex(),
    "native verify: search",
  );

  const rowsByTemplate: Record<string, RouteLikeRecord[]> = {
    "events-hub": events,
    "in-the-news-directory": articles,
    "kosher-directory": places,
    "search-page": searchRecords,
  };

  for (const row of NATIVE_CONTRACT_MATRIX) {
    const rows = rowsByTemplate[row.templateType] ?? [];
    errors.push(
      ...collectMissingRequiredFields(
        rows,
        row.requiredFields,
        `${row.routePath} (${row.templateType})`,
      ),
    );
  }

  for (const [routePath, neighborhood] of Object.entries(KOSHER_ROUTE_NEIGHBORHOOD)) {
    const count = places.filter((place) => place.neighborhood === neighborhood).length;
    if (count === 0) {
      errors.push(`native kosher route ${routePath} has zero places for neighborhood ${neighborhood}`);
    }
  }

  const internalInTheNewsCount = articles.filter((row) => row.path.startsWith("/")).length;
  if (internalInTheNewsCount === 0) {
    errors.push("/in-the-news contract has no internal /news articles");
  }

  const externalInTheNewsCount = articles.filter(
    (row) => row.path.startsWith("http") || row.sourceUrl.startsWith("http"),
  ).length;
  if (externalInTheNewsCount === 0) {
    warnings.push("/in-the-news contract has no external source links");
  }

  if (searchRecords.length === 0) {
    errors.push("/search contract has no searchable records");
  }

  const mirrorLifecycle = assertMirrorOnlyFieldTracking();
  errors.push(...mirrorLifecycle.errors);
  warnings.push(...mirrorLifecycle.warnings);

  console.log(`native_contract_routes=${NATIVE_CONTRACT_MATRIX.length}`);
  console.log(`native_events=${events.length}`);
  console.log(`native_in_the_news=${articles.length}`);
  console.log(`native_kosher_places=${places.length}`);
  console.log(`native_search_records=${searchRecords.length}`);

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
