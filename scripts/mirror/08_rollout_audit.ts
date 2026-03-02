import fs from "node:fs/promises";
import path from "node:path";

type CheckStatus = "pending" | "pass" | "fail";

type RouteRolloutRecord = {
  path: string;
  wave: string;
  owners: {
    engineering: string;
    qa: string;
    seo: string;
  };
  nativeFlag: {
    env: string;
    implemented: boolean;
    enabled: boolean;
    enabledOn: string | null;
  };
  monitoring: {
    visual: CheckStatus;
    functional: CheckStatus;
    seo: CheckStatus;
    startedOn: string | null;
  };
  decommission: {
    runtimeHooksRemoved: boolean;
    documentHtmlFixesRemoved: boolean;
    globalCssOverridesRemoved: boolean;
    completedOn: string | null;
  };
  baselinePatchDebt: {
    runtimeHooks: number;
    documentHtmlFixes: number;
    globalCssOverrides: number;
  };
  notes: string;
};

type WaveRecord = {
  id: string;
  dateStart: string;
  dateEnd: string;
  engineeringOwner: string;
  qaOwner: string;
  seoOwner: string;
  routes: string[];
};

type RolloutTracker = {
  version: number;
  lastUpdated: string;
  stabilityWindowDays: number;
  checkCommands: {
    visual: string;
    functional: string;
    seo: string;
  };
  waves: WaveRecord[];
  routes: RouteRolloutRecord[];
};

type LivePatchDebt = {
  runtimeHooks: number;
  documentHtmlFixes: number;
  globalCssOverrides: number;
};

type RouteAuditRecord = {
  path: string;
  wave: string;
  nativeFlagEnv: string;
  nativeFlagEnabled: boolean;
  nativeFlagImplemented: boolean;
  checks: {
    visual: CheckStatus;
    functional: CheckStatus;
    seo: CheckStatus;
    allPassed: boolean;
  };
  stability: {
    startedOn: string | null;
    endsOn: string | null;
    satisfied: boolean;
  };
  baselinePatchDebt: LivePatchDebt;
  livePatchDebt: LivePatchDebt;
  patchDebtDelta: LivePatchDebt;
  decommissionChecklist: {
    runtimeHooksRemoved: boolean;
    documentHtmlFixesRemoved: boolean;
    globalCssOverridesRemoved: boolean;
    allComplete: boolean;
  };
  eligibleForPatchRemoval: boolean;
  retired: boolean;
  status: string;
  blockers: string[];
  notes: string;
};

const REPO_ROOT = process.cwd();
const TRACKER_PATH = path.join(REPO_ROOT, "mirror-data", "rollout", "route-rollout-tracker.json");
const AUDIT_OUTPUT_PATH = path.join(REPO_ROOT, "mirror-data", "rollout", "mirror-retirement-audit.json");
const TRACKER_REPORT_PATH = path.join(REPO_ROOT, "docs", "mirror-rollout", "rollout-tracker.md");
const COMPLETION_REPORT_PATH = path.join(
  REPO_ROOT,
  "docs",
  "mirror-rollout",
  "mirror-retirement-completion-report.md",
);

const RUNTIME_SOURCE_FILES = [
  path.join(REPO_ROOT, "components", "mirror", "mirror-runtime.tsx"),
  path.join(REPO_ROOT, "lib", "mirror", "kosher-map.ts"),
];
const DOCUMENT_HTML_SOURCE_PATH = path.join(REPO_ROOT, "lib", "mirror", "document-html.ts");
const GLOBAL_CSS_SOURCE_PATH = path.join(REPO_ROOT, "app", "globals.css");

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countRegexMatches(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

function countQuotedPath(source: string, pathValue: string) {
  const escaped = escapeRegex(pathValue);
  return countRegexMatches(source, new RegExp(`["']${escaped}["']`, "g"));
}

function countCssRouteOverrides(source: string, pathValue: string) {
  const escaped = escapeRegex(pathValue);
  return countRegexMatches(source, new RegExp(`data-path="${escaped}"`, "g"));
}

function addDays(dateIso: string, days: number) {
  const parsed = new Date(`${dateIso}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function checksAllPassed(record: RouteRolloutRecord) {
  return (
    record.monitoring.visual === "pass" &&
    record.monitoring.functional === "pass" &&
    record.monitoring.seo === "pass"
  );
}

function buildStatus(
  nativeEnabled: boolean,
  allChecksPassed: boolean,
  stabilitySatisfied: boolean,
  decommissionChecklistComplete: boolean,
  patchDebtCleared: boolean,
) {
  if (!nativeEnabled) {
    return "pending-native-enable";
  }

  if (!allChecksPassed) {
    return "monitoring-checks-pending";
  }

  if (!stabilitySatisfied) {
    return "stability-window-active";
  }

  if (!decommissionChecklistComplete) {
    return "ready-for-patch-removal";
  }

  if (!patchDebtCleared) {
    return "decommission-flagged-but-debt-remains";
  }

  return "retired";
}

function boolText(value: boolean) {
  return value ? "yes" : "no";
}

function checkText(value: CheckStatus) {
  if (value === "pass") return "pass";
  if (value === "fail") return "fail";
  return "pending";
}

function nativeText(nativeFlagEnabled: boolean, nativeFlagEnv: string, implemented: boolean) {
  const state = nativeFlagEnabled ? "on" : "off";
  const impl = implemented ? "implemented" : "not-implemented";
  return `${state} (${nativeFlagEnv}, ${impl})`;
}

function stabilityText(startedOn: string | null, endsOn: string | null, satisfied: boolean) {
  if (!startedOn || !endsOn) {
    return "not-started";
  }

  return `${startedOn} -> ${endsOn} (${satisfied ? "passed" : "active"})`;
}

async function main() {
  const tracker = JSON.parse(await fs.readFile(TRACKER_PATH, "utf8")) as RolloutTracker;
  const runtimeSources = await Promise.all(RUNTIME_SOURCE_FILES.map((filePath) => fs.readFile(filePath, "utf8")));
  const runtimeSource = runtimeSources.join("\n");
  const documentHtmlSource = await fs.readFile(DOCUMENT_HTML_SOURCE_PATH, "utf8");
  const globalCssSource = await fs.readFile(GLOBAL_CSS_SOURCE_PATH, "utf8");

  const today = new Date().toISOString().slice(0, 10);

  const routesAudit: RouteAuditRecord[] = tracker.routes.map((record) => {
    const livePatchDebt: LivePatchDebt = {
      runtimeHooks: countQuotedPath(runtimeSource, record.path),
      documentHtmlFixes: countQuotedPath(documentHtmlSource, record.path),
      globalCssOverrides: countCssRouteOverrides(globalCssSource, record.path),
    };

    const patchDebtDelta: LivePatchDebt = {
      runtimeHooks: livePatchDebt.runtimeHooks - record.baselinePatchDebt.runtimeHooks,
      documentHtmlFixes: livePatchDebt.documentHtmlFixes - record.baselinePatchDebt.documentHtmlFixes,
      globalCssOverrides: livePatchDebt.globalCssOverrides - record.baselinePatchDebt.globalCssOverrides,
    };

    const allChecksPassed = checksAllPassed(record);
    const endsOn = record.monitoring.startedOn
      ? addDays(record.monitoring.startedOn, tracker.stabilityWindowDays)
      : null;
    const stabilitySatisfied = Boolean(endsOn && today >= endsOn);

    const decommissionChecklistComplete =
      record.decommission.runtimeHooksRemoved &&
      record.decommission.documentHtmlFixesRemoved &&
      record.decommission.globalCssOverridesRemoved;

    const patchDebtCleared =
      livePatchDebt.runtimeHooks === 0 &&
      livePatchDebt.documentHtmlFixes === 0 &&
      livePatchDebt.globalCssOverrides === 0;

    const eligibleForPatchRemoval = record.nativeFlag.enabled && allChecksPassed && stabilitySatisfied;
    const retired = decommissionChecklistComplete && patchDebtCleared;

    const blockers: string[] = [];
    if (!record.nativeFlag.enabled) blockers.push("native flag is off");
    if (!allChecksPassed) blockers.push("visual/functional/seo checks are incomplete");
    if (!stabilitySatisfied) blockers.push("7-day stability window has not elapsed");
    if (!decommissionChecklistComplete) blockers.push("decommission checklist is incomplete");
    if (!patchDebtCleared) blockers.push("route-specific patch debt remains");

    return {
      path: record.path,
      wave: record.wave,
      nativeFlagEnv: record.nativeFlag.env,
      nativeFlagEnabled: record.nativeFlag.enabled,
      nativeFlagImplemented: record.nativeFlag.implemented,
      checks: {
        visual: record.monitoring.visual,
        functional: record.monitoring.functional,
        seo: record.monitoring.seo,
        allPassed: allChecksPassed,
      },
      stability: {
        startedOn: record.monitoring.startedOn,
        endsOn,
        satisfied: stabilitySatisfied,
      },
      baselinePatchDebt: record.baselinePatchDebt,
      livePatchDebt,
      patchDebtDelta,
      decommissionChecklist: {
        runtimeHooksRemoved: record.decommission.runtimeHooksRemoved,
        documentHtmlFixesRemoved: record.decommission.documentHtmlFixesRemoved,
        globalCssOverridesRemoved: record.decommission.globalCssOverridesRemoved,
        allComplete: decommissionChecklistComplete,
      },
      eligibleForPatchRemoval,
      retired,
      status: buildStatus(
        record.nativeFlag.enabled,
        allChecksPassed,
        stabilitySatisfied,
        decommissionChecklistComplete,
        patchDebtCleared,
      ),
      blockers,
      notes: record.notes,
    };
  });

  const summary = {
    auditedAt: new Date().toISOString(),
    trackerVersion: tracker.version,
    stabilityWindowDays: tracker.stabilityWindowDays,
    totalRoutes: routesAudit.length,
    nativeEnabledRoutes: routesAudit.filter((item) => item.nativeFlagEnabled).length,
    checksPassedRoutes: routesAudit.filter((item) => item.checks.allPassed).length,
    stabilitySatisfiedRoutes: routesAudit.filter((item) => item.stability.satisfied).length,
    routesEligibleForPatchRemoval: routesAudit.filter((item) => item.eligibleForPatchRemoval).length,
    retiredRoutes: routesAudit.filter((item) => item.retired).length,
    routesWithPatchDebt: routesAudit.filter(
      (item) =>
        item.livePatchDebt.runtimeHooks > 0 ||
        item.livePatchDebt.documentHtmlFixes > 0 ||
        item.livePatchDebt.globalCssOverrides > 0,
    ).length,
  };

  const auditPayload = {
    summary,
    waves: tracker.waves,
    checkCommands: tracker.checkCommands,
    routes: routesAudit,
  };

  await fs.mkdir(path.dirname(AUDIT_OUTPUT_PATH), { recursive: true });
  await fs.writeFile(AUDIT_OUTPUT_PATH, `${JSON.stringify(auditPayload, null, 2)}\n`, "utf8");

  const waveLines = tracker.waves.map((wave) => {
    const routes = wave.routes.join(", ");
    return `| ${wave.id} | ${wave.dateStart} -> ${wave.dateEnd} | ${wave.engineeringOwner} | ${wave.qaOwner} | ${wave.seoOwner} | ${routes} |`;
  });

  const routeLines = routesAudit.map((route) => {
    const checks = `v:${checkText(route.checks.visual)} / f:${checkText(route.checks.functional)} / seo:${checkText(route.checks.seo)}`;
    const debt = `${route.livePatchDebt.runtimeHooks}/${route.livePatchDebt.documentHtmlFixes}/${route.livePatchDebt.globalCssOverrides}`;
    const checklist = [
      `runtime:${boolText(route.decommissionChecklist.runtimeHooksRemoved)}`,
      `doc:${boolText(route.decommissionChecklist.documentHtmlFixesRemoved)}`,
      `css:${boolText(route.decommissionChecklist.globalCssOverridesRemoved)}`,
    ].join(", ");

    return [
      `| ${route.path}`,
      route.wave,
      nativeText(route.nativeFlagEnabled, route.nativeFlagEnv, route.nativeFlagImplemented),
      checks,
      stabilityText(route.stability.startedOn, route.stability.endsOn, route.stability.satisfied),
      debt,
      checklist,
      route.status,
      `${route.blockers.join("; ") || "none"} |`,
    ].join(" | ");
  });

  const trackerMarkdown = [
    "# Mirror Rollout Tracker",
    "",
    `Generated on ${today}. Stability window: ${tracker.stabilityWindowDays} days.`,
    "",
    "## Rollout Waves and Ownership Calendar",
    "",
    "| Wave | Date Range | Engineering Owner | QA Owner | SEO Owner | Routes |",
    "| --- | --- | --- | --- | --- | --- |",
    ...waveLines,
    "",
    "## Route Status",
    "",
    "| Route | Wave | Native Flag | Checks | Stability Window | Live Patch Debt (runtime/doc/css) | Decommission Checklist | Status | Blockers |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...routeLines,
    "",
    "## Check Commands",
    "",
    `- visual: \`${tracker.checkCommands.visual}\``,
    `- functional: \`${tracker.checkCommands.functional}\``,
    `- seo: \`${tracker.checkCommands.seo}\``,
    "",
    `Audit source: \`mirror-data/rollout/route-rollout-tracker.json\``,
  ].join("\n");

  const blockedRoutes = routesAudit.filter((route) => route.status !== "retired");
  const blockedLines = blockedRoutes.map(
    (route) => `- ${route.path}: ${route.blockers.join("; ") || "none"} (${route.status})`,
  );

  const completionMarkdown = [
    "# Mirror Retirement Completion Report",
    "",
    `Generated on ${today}.`,
    "",
    "## Summary",
    "",
    `- Total target routes: ${summary.totalRoutes}`,
    `- Native-enabled routes: ${summary.nativeEnabledRoutes}`,
    `- Routes with all checks passing: ${summary.checksPassedRoutes}`,
    `- Routes that completed 7-day stability window: ${summary.stabilitySatisfiedRoutes}`,
    `- Routes eligible for patch removal now: ${summary.routesEligibleForPatchRemoval}`,
    `- Retired routes (all patch debt removed): ${summary.retiredRoutes}`,
    `- Routes with live patch debt: ${summary.routesWithPatchDebt}`,
    "",
    "## Blocking Routes",
    "",
    ...(blockedLines.length > 0 ? blockedLines : ["- none"]),
    "",
    "## Artifacts",
    "",
    "- machine audit json: `mirror-data/rollout/mirror-retirement-audit.json`",
    "- tracker source json: `mirror-data/rollout/route-rollout-tracker.json`",
    "- tracker markdown: `docs/mirror-rollout/rollout-tracker.md`",
  ].join("\n");

  await fs.mkdir(path.dirname(TRACKER_REPORT_PATH), { recursive: true });
  await fs.writeFile(TRACKER_REPORT_PATH, `${trackerMarkdown}\n`, "utf8");
  await fs.writeFile(COMPLETION_REPORT_PATH, `${completionMarkdown}\n`, "utf8");

  console.log(`audit_json=${path.relative(REPO_ROOT, AUDIT_OUTPUT_PATH)}`);
  console.log(`tracker_md=${path.relative(REPO_ROOT, TRACKER_REPORT_PATH)}`);
  console.log(`completion_md=${path.relative(REPO_ROOT, COMPLETION_REPORT_PATH)}`);
  console.log(`routes_total=${summary.totalRoutes}`);
  console.log(`routes_retired=${summary.retiredRoutes}`);
  console.log(`routes_with_patch_debt=${summary.routesWithPatchDebt}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
