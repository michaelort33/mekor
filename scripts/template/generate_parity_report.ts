import fs from "node:fs/promises";
import path from "node:path";

type ContentIndexRecord = {
  path: string;
  type: string;
  file: string;
};

type AliasRecord = {
  from: string;
  to: string;
  reason: string;
};

type StatusOverrideRecord = {
  path: string;
  status: number;
  sourceUrl: string;
};

type PageDocument = {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
};

const TEMPLATE_TYPES = new Set(["post", "news", "event", "profile", "category", "tag"]);
const TEMPLATE_PREFIXES = [
  "/post/",
  "/news/",
  "/events-1/",
  "/profile/",
  "/kosher-posts/categories/",
  "/kosher-posts/tags/",
];

async function readJsonFile<T>(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath);
  return JSON.parse(await fs.readFile(absolutePath, "utf8")) as T;
}

function isTemplatePath(pathValue: string) {
  return TEMPLATE_PREFIXES.some((prefix) => pathValue.startsWith(prefix));
}

async function main() {
  const [index, aliases, statusOverrides] = await Promise.all([
    readJsonFile<ContentIndexRecord[]>("mirror-data/content/index.json"),
    readJsonFile<AliasRecord[]>("mirror-data/routes/aliases.json"),
    readJsonFile<StatusOverrideRecord[]>("mirror-data/routes/status-overrides.json"),
  ]);

  const templateEntries = index.filter((entry) => TEMPLATE_TYPES.has(entry.type));
  const counts = templateEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.type] = (acc[entry.type] ?? 0) + 1;
    return acc;
  }, {});

  const byType = templateEntries.reduce<Record<string, string[]>>((acc, entry) => {
    if (!acc[entry.type]) {
      acc[entry.type] = [];
    }

    acc[entry.type].push(entry.path);
    return acc;
  }, {});

  const metadataChecks = await Promise.all(
    templateEntries.map(async (entry) => {
      const document = await readJsonFile<PageDocument>(path.join("mirror-data/content", entry.file));
      return {
        path: entry.path,
        type: entry.type,
        hasRequiredSeoFields: Boolean(document.title) && Boolean(document.canonical),
        hasDescription: Boolean(document.description),
        hasOgTitle: Boolean(document.ogTitle),
        hasOgDescription: Boolean(document.ogDescription),
        hasTwitterCard: Boolean(document.twitterCard),
        hasTwitterTitle: Boolean(document.twitterTitle),
        hasTwitterDescription: Boolean(document.twitterDescription),
      };
    }),
  );

  const missingSeoFieldPaths = metadataChecks
    .filter((check) => !check.hasRequiredSeoFields)
    .map((check) => check.path);

  const templateAliases = aliases.filter((entry) => isTemplatePath(entry.from) || isTemplatePath(entry.to));
  const templateStatusOverrides = statusOverrides.filter((entry) => isTemplatePath(entry.path));

  const report = {
    generatedAt: new Date().toISOString(),
    templateTypeCounts: counts,
    routeSamples: Object.fromEntries(
      Object.entries(byType).map(([type, paths]) => [type, paths.slice(0, 5)]),
    ),
    aliasRoutes: {
      total: templateAliases.length,
      entries: templateAliases,
    },
    statusOverrides: {
      total: templateStatusOverrides.length,
      byStatus: templateStatusOverrides.reduce<Record<string, number>>((acc, entry) => {
        const key = String(entry.status);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
      samplePaths: templateStatusOverrides.slice(0, 12).map((entry) => entry.path),
    },
    seoParity: {
      checkedRoutes: metadataChecks.length,
      missingRequiredSeoFieldRoutes: missingSeoFieldPaths.length,
      missingRequiredSeoFieldPaths: missingSeoFieldPaths.slice(0, 20),
      optionalFieldCoverage: {
        description: metadataChecks.filter((row) => row.hasDescription).length,
        ogTitle: metadataChecks.filter((row) => row.hasOgTitle).length,
        ogDescription: metadataChecks.filter((row) => row.hasOgDescription).length,
        twitterCard: metadataChecks.filter((row) => row.hasTwitterCard).length,
        twitterTitle: metadataChecks.filter((row) => row.hasTwitterTitle).length,
        twitterDescription: metadataChecks.filter((row) => row.hasTwitterDescription).length,
      },
    },
  };

  const outputDir = path.join(process.cwd(), "reports");
  const outputFile = path.join(outputDir, "template-parity-report.json");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(report, null, 2));

  console.log(`Wrote parity report to ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
