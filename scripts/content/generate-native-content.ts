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

  const documentRecords = sortByPath(allDocuments.map((document) => toDocumentRecord(document)));
  const templateRecords = templateResults
    .filter((row): row is NativeTemplateRecord => Boolean(row))
    .sort((a, b) => a.document.path.localeCompare(b.document.path));
  const routeData: NativeGeneratedRouteData = routes;

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
      JSON.stringify(index, null, 2) + "\n",
      "utf8",
    ),
    fs.writeFile(
      path.join(OUTPUT_DIR, "routes.json"),
      JSON.stringify(routeData, null, 2) + "\n",
      "utf8",
    ),
    fs.writeFile(
      path.join(OUTPUT_DIR, "search.json"),
      JSON.stringify(search, null, 2) + "\n",
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
