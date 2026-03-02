import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { NATIVE_ROUTE_PATHS } from "../../lib/native-routes";

export type VisualBreakpoint = {
  name: "mobile" | "tablet" | "desktop";
  width: number;
  height: number;
};

export const VISUAL_BREAKPOINTS: VisualBreakpoint[] = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1366, height: 900 },
];

export const DEFAULT_THRESHOLD_PERCENT = 2;

const PREFERRED_LOCAL_OUTPUT_ROOT = "/Users/meshulumort/Documents/mekor/output";

export const REPO_ROOT = process.cwd();
export const DEFAULT_BASELINE_DIR = path.join(REPO_ROOT, "visual-parity", "baseline");
export const DEFAULT_APPROVALS_DIR = path.join(REPO_ROOT, "visual-parity", "approvals");

export function resolveOutputRoot() {
  const fromEnv = process.env.VISUAL_PARITY_OUTPUT_ROOT?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  if (fs.existsSync(PREFERRED_LOCAL_OUTPUT_ROOT)) {
    return PREFERRED_LOCAL_OUTPUT_ROOT;
  }

  return path.join(REPO_ROOT, "output");
}

export function resolveVisualParityOutputRoot() {
  return path.join(resolveOutputRoot(), "visual-parity");
}

export function normalizeRoutePath(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "/";
  }

  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const [pathname] = withSlash.split("?");
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
}

export function resolveTargetRoutes() {
  const raw = process.env.VISUAL_PARITY_ROUTES?.trim();
  if (!raw) {
    return [...NATIVE_ROUTE_PATHS];
  }

  const filtered = raw
    .split(",")
    .map((part) => normalizeRoutePath(part))
    .filter(Boolean);

  const allowed = new Set<string>(NATIVE_ROUTE_PATHS);
  const invalid = filtered.filter((route) => !allowed.has(route));
  if (invalid.length > 0) {
    throw new Error(
      `VISUAL_PARITY_ROUTES contains unknown native routes: ${invalid.join(", ")}. Allowed: ${NATIVE_ROUTE_PATHS.join(", ")}`,
    );
  }

  return [...new Set(filtered)];
}

export function routeKey(routePath: string) {
  const normalized = normalizeRoutePath(routePath);
  const slug =
    normalized === "/"
      ? "home"
      : normalized
          .slice(1)
          .replace(/[^a-zA-Z0-9]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase();

  const hash = crypto.createHash("sha1").update(normalized).digest("hex").slice(0, 10);
  return `${slug || "home"}--${hash}`;
}

export type RouteDescriptor = {
  path: string;
  key: string;
};

export function resolveRouteDescriptors() {
  return resolveTargetRoutes().map((routePath) => ({
    path: routePath,
    key: routeKey(routePath),
  })) as RouteDescriptor[];
}

export async function ensureDir(dirPath: string) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

export function parseThresholdPercent() {
  const raw = process.env.VISUAL_PARITY_THRESHOLD_PERCENT?.trim();
  if (!raw) {
    return DEFAULT_THRESHOLD_PERCENT;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`VISUAL_PARITY_THRESHOLD_PERCENT must be a non-negative number. Received: ${raw}`);
  }

  return parsed;
}
