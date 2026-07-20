import fs from "node:fs/promises";
import path from "node:path";

import type { PageDocument } from "@/lib/mirror/types";
import { loadRouteData, listDocumentsByType } from "@/lib/mirror/loaders";
import {
  buildArchiveTemplateData,
  buildArticleTemplateData,
  buildEventTemplateData,
  buildProfileTemplateData,
} from "@/lib/templates/template-data";
import {
  getNativeSearchIndex,
  loadNativeContentIndex,
  type NativeDocumentType,
  type NativePageDocument,
} from "@/lib/native-content/content-loader";
import type {
  NativeContentDocument,
  NativeGeneratedRouteData,
  NativeTemplateRecord,
} from "@/lib/content/types";
import {
  HAND_AUTHORED_DOCUMENTS,
  HAND_AUTHORED_INDEX,
  HAND_AUTHORED_ROUTES,
  HAND_AUTHORED_SEARCH,
  HAND_AUTHORED_TEMPLATES,
} from "@/lib/content/hand-authored";

const OUTPUT_DIR = path.join(process.cwd(), "lib/content/generated");
const DOCUMENT_TYPES: NativeDocumentType[] = [
  "page",
  "post",
  "news",
  "event",
  "category",
  "tag",
  "profile",
];

function toDocumentRecord(document: NativePageDocument): NativeContentDocument {
  return {
    id: document.id,
    type: document.type,
    path: document.path,
    url: document.url,
    slug: document.slug,
    title: document.title,
    description: document.description,
    canonical: document.canonical,
    ogTitle: document.ogTitle,
    ogDescription: document.ogDescription,
    ogImage: document.ogImage,
    twitterCard: document.twitterCard,
    twitterTitle: document.twitterTitle,
    twitterDescription: document.twitterDescription,
    capturedAt: document.capturedAt,
  };
}

function sortByPath<T extends { path: string }>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => a.path.localeCompare(b.path));
}

function mergeByPath<T extends { path: string }>(generated: T[], handAuthored: T[]): T[] {
  const records = new Map(generated.map((record) => [record.path, record]));
  for (const record of handAuthored) {
    records.set(record.path, record);
  }
  return sortByPath([...records.values()]);
}

function mergeTemplates(
  generated: NativeTemplateRecord[],
  handAuthored: NativeTemplateRecord[],
): NativeTemplateRecord[] {
  const records = new Map(generated.map((record) => [record.document.path, record]));
  for (const record of handAuthored) {
    records.set(record.document.path, record);
  }
  return [...records.values()].sort((a, b) =>
    a.document.path.localeCompare(b.document.path),
  );
}

async function loadAllDocuments() {
  const records = await Promise.all(DOCUMENT_TYPES.map((type) => listDocumentsByType(type)));
  const map = new Map<string, PageDocument>();

  for (const batch of records) {
    for (const document of batch) {
      map.set(document.path, document);
    }
  }

  return sortByPath([...map.values()]);
}

async function buildTemplateRecord(document: PageDocument): Promise<NativeTemplateRecord | null> {
  const documentRecord = toDocumentRecord(document);

  if (document.type === "post" || document.type === "news") {
    return {
      kind: "article",
      document: documentRecord,
      data: buildArticleTemplateData(document),
    };
  }

  if (document.type === "event") {
    return {
      kind: "event",
      document: documentRecord,
      data: buildEventTemplateData(document),
    };
  }

  if (document.type === "profile") {
    return {
      kind: "profile",
      document: documentRecord,
      data: await buildProfileTemplateData(document),
    };
  }

  if (document.type === "category" || document.type === "tag") {
    return {
      kind: "archive",
      document: documentRecord,
      data: await buildArchiveTemplateData(document),
    };
  }

  return null;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const allDocuments = await loadAllDocuments();
  const [templateResults, index, routes, search] = await Promise.all([
    Promise.all(allDocuments.map((row) => buildTemplateRecord(row))),
    loadNativeContentIndex(),
    loadRouteData(),
    getNativeSearchIndex(),
  ]);

  const documentRecords = mergeByPath(
    allDocuments.map((document) => toDocumentRecord(document)),
    HAND_AUTHORED_DOCUMENTS,
  );
  const templateRecords = mergeTemplates(
    templateResults.filter((row): row is NativeTemplateRecord => Boolean(row)),
    HAND_AUTHORED_TEMPLATES,
  );
  const contentIndex = mergeByPath(index, HAND_AUTHORED_INDEX);
  const routeData: NativeGeneratedRouteData = {
    ...routes,
    canonical: mergeByPath(routes.canonical, HAND_AUTHORED_ROUTES.canonical),
    reachable: mergeByPath(routes.reachable, HAND_AUTHORED_ROUTES.reachable),
  };
  const searchRecords = mergeByPath(search, HAND_AUTHORED_SEARCH);

  await Promise.all([
    fs.writeFile(
      path.join(OUTPUT_DIR, "documents.json"),
      JSON.stringify(documentRecords, null, 2) + "\n",
      "utf8",
    ),
    fs.writeFile(
      path.join(OUTPUT_DIR, "templates.json"),
      JSON.stringify(templateRecords, null, 2) + "\n",
      "utf8",
    ),
    fs.writeFile(
      path.join(OUTPUT_DIR, "index.json"),
      JSON.stringify(contentIndex, null, 2) + "\n",
      "utf8",
    ),
    fs.writeFile(
      path.join(OUTPUT_DIR, "routes.json"),
      JSON.stringify(routeData, null, 2) + "\n",
      "utf8",
    ),
    fs.writeFile(
      path.join(OUTPUT_DIR, "search.json"),
      JSON.stringify(searchRecords, null, 2) + "\n",
      "utf8",
    ),
  ]);

  console.log(
    "Generated native content registry:",
    documentRecords.length,
    "documents,",
    templateRecords.length,
    "templates.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
