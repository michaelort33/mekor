import fs from "node:fs/promises";
import path from "node:path";

import { normalizePath } from "../../lib/mirror/url";
import {
  getConfiguredRenderMode,
  getEffectiveRenderMode,
  isForceMirrorAllEnabled,
  listConfiguredRenderModes,
} from "../../lib/routing/render-mode";
import { ROUTES_DIR } from "./_shared";

type RouteRecord = { path: string; sourceUrl: string };
type StatusOverrideRecord = { path: string; status: number };

async function readJson<T>(filePath: string, fallback: T) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function toPathname(pathValue: string) {
  return normalizePath(pathValue).split("?")[0] ?? "/";
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function printSection(title: string, items: string[]) {
  console.log(`${title} (${items.length})`);
  if (items.length === 0) {
    console.log("- none");
    return;
  }

  for (const item of items) {
    console.log(`- ${item}`);
  }
}

async function main() {
  const [htmlRoutes, statusOverrides] = await Promise.all([
    readJson<RouteRecord[]>(path.join(ROUTES_DIR, "html-200.json"), []),
    readJson<StatusOverrideRecord[]>(path.join(ROUTES_DIR, "status-overrides.json"), []),
  ]);

  const knownMirrorPaths = uniqueSorted([
    ...htmlRoutes.map((record) => toPathname(record.path)),
    ...statusOverrides.map((record) => toPathname(record.path)),
  ]);
  const knownMirrorPathSet = new Set(knownMirrorPaths);

  const configuredRoutes = listConfiguredRenderModes();
  const configuredPaths = uniqueSorted(configuredRoutes.map((entry) => toPathname(entry.path)));

  const nativeEnabledRoutes = uniqueSorted(
    configuredPaths.filter((pathValue) => getEffectiveRenderMode(pathValue) === "native"),
  );
  const mirrorOnlyRoutes = uniqueSorted(
    knownMirrorPaths.filter((pathValue) => getEffectiveRenderMode(pathValue) === "mirror"),
  );
  const unknownOrUnmappedRoutes = uniqueSorted(
    configuredPaths.filter((pathValue) => !knownMirrorPathSet.has(pathValue)),
  );
  const explicitlyMirrorConfigured = uniqueSorted(
    configuredPaths.filter((pathValue) => getConfiguredRenderMode(pathValue) === "mirror"),
  );

  console.log(`force_mirror_all=${isForceMirrorAllEnabled()}`);
  console.log("");
  printSection("native-enabled routes", nativeEnabledRoutes);
  console.log("");
  printSection("mirror-only routes", mirrorOnlyRoutes);
  console.log("");
  printSection("unknown/unmapped routes", unknownOrUnmappedRoutes);
  console.log("");
  printSection("explicitly mirror-configured routes", explicitlyMirrorConfigured);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
