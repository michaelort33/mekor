import fs from "node:fs/promises";
import path from "node:path";

import { CONTENT_DIR, SEARCH_DIR, ensureMirrorDirs, writeJson } from "./_shared";

type DocumentRecord = {
  path: string;
  type: string;
  title: string;
  description: string;
  text: string;
};

function tokenize(value: string) {
  return [...new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  )].slice(0, 300);
}

async function main() {
  await ensureMirrorDirs();

  const allDocsFile = path.join(CONTENT_DIR, "all-documents.json");
  const raw = await fs.readFile(allDocsFile, "utf8");
  const docs = JSON.parse(raw) as DocumentRecord[];

  const searchable = docs.filter((doc) =>
    ["page", "post", "news", "event", "category", "profile"].includes(doc.type),
  );

  const index = searchable.map((doc) => {
    const text = (doc.text || "").replace(/\s+/g, " ").trim();
    const excerpt = text.slice(0, 280);
    const terms = tokenize(`${doc.title} ${doc.description} ${excerpt}`);

    return {
      path: doc.path,
      type: doc.type,
      title: doc.title,
      description: doc.description,
      excerpt,
      terms,
    };
  });

  await Promise.all([
    writeJson(path.join(SEARCH_DIR, "index.json"), index),
    writeJson(path.join(SEARCH_DIR, "summary.json"), {
      generatedAt: new Date().toISOString(),
      recordCount: index.length,
    }),
  ]);

  console.log(`search_records=${index.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
