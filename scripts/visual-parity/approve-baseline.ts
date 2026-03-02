import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_APPROVALS_DIR,
  DEFAULT_BASELINE_DIR,
  ensureDir,
  resolveVisualParityOutputRoot,
} from "./_shared";

type CaptureManifest = {
  mode: "baseline" | "candidate";
  baseUrl: string;
  generatedAt: string;
  waitAfterLoadMs: number;
  navigationTimeoutMs?: number;
  routes: Array<{
    path: string;
    key: string;
  }>;
  breakpoints: Array<{
    name: string;
    width: number;
    height: number;
  }>;
};

function resolveProposedBaselineDir() {
  return path.resolve(
    process.env.VISUAL_PARITY_PROPOSED_BASELINE_DIR?.trim() ||
      path.join(resolveVisualParityOutputRoot(), "proposed-baseline"),
  );
}

function resolveBaselineDir() {
  return path.resolve(process.env.VISUAL_PARITY_BASELINE_DIR?.trim() || DEFAULT_BASELINE_DIR);
}

function resolveApprovalsDir() {
  return path.resolve(process.env.VISUAL_PARITY_APPROVALS_DIR?.trim() || DEFAULT_APPROVALS_DIR);
}

function requireApprovalNote() {
  const note = process.env.VISUAL_PARITY_APPROVAL_NOTE?.trim();
  if (!note) {
    throw new Error("VISUAL_PARITY_APPROVAL_NOTE is required to approve a baseline refresh.");
  }

  return note;
}

function toStamp(value: string) {
  return value.replace(/[^0-9]/g, "").slice(0, 14);
}

async function main() {
  const proposedDir = resolveProposedBaselineDir();
  const baselineDir = resolveBaselineDir();
  const approvalsDir = resolveApprovalsDir();
  const approvalNote = requireApprovalNote();
  const approvedBy = process.env.VISUAL_PARITY_APPROVED_BY?.trim() || process.env.GITHUB_ACTOR || process.env.USER || "unknown";
  const approvedAt = new Date().toISOString();
  const sourceGitSha = process.env.GITHUB_SHA || null;

  const captureManifestPath = path.join(proposedDir, "capture-manifest.json");
  if (!fs.existsSync(captureManifestPath)) {
    throw new Error(`Missing proposed baseline manifest at ${captureManifestPath}`);
  }

  const captureManifest = JSON.parse(
    await fsp.readFile(captureManifestPath, "utf8"),
  ) as CaptureManifest;

  if (captureManifest.mode !== "baseline") {
    throw new Error(`Expected baseline capture manifest but found mode=${captureManifest.mode}`);
  }

  await ensureDir(baselineDir);

  for (const route of captureManifest.routes) {
    const sourceRouteDir = path.join(proposedDir, route.key);
    const targetRouteDir = path.join(baselineDir, route.key);

    if (!fs.existsSync(sourceRouteDir)) {
      throw new Error(`Missing source baseline directory for ${route.path}: ${sourceRouteDir}`);
    }

    await fsp.rm(targetRouteDir, { recursive: true, force: true });
    await fsp.cp(sourceRouteDir, targetRouteDir, { recursive: true });
    console.log(`[approve] promoted ${route.path} -> ${targetRouteDir}`);
  }

  const baselineManifest = {
    approvedAt,
    approvedBy,
    approvalNote,
    sourceGitSha,
    sourceCaptureManifest: captureManifest,
  };

  const baselineManifestPath = path.join(baselineDir, "baseline-manifest.json");
  await fsp.writeFile(baselineManifestPath, `${JSON.stringify(baselineManifest, null, 2)}\n`, "utf8");

  await ensureDir(approvalsDir);
  const approvalFileName = `${toStamp(approvedAt)}-${(sourceGitSha || "local").slice(0, 10)}.json`;
  const approvalPath = path.join(approvalsDir, approvalFileName);
  await fsp.writeFile(approvalPath, `${JSON.stringify(baselineManifest, null, 2)}\n`, "utf8");

  console.log(`[approve] wrote ${baselineManifestPath}`);
  console.log(`[approve] wrote ${approvalPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
