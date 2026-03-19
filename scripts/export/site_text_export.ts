import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { load } from "cheerio";
import { Browser, chromium } from "playwright";

const execFile = promisify(execFileCallback);

type UrlKind = "html" | "pdf" | "docx" | "xml" | "other";

type ManifestEntry = {
  index: number;
  url: string;
  slug: string;
  kind: UrlKind;
  status: "ok" | "error";
  title?: string;
  outputDir: string;
  contentFile?: string;
  sourceFile?: string;
  htmlFile?: string;
  error?: string;
};

const ROOT = process.cwd();
const DEFAULT_URL_LIST = path.join(
  ROOT,
  "mekorhabracha_public_urls_2026-02-28_playwright_clean_reachable.txt",
);
const RUN_STAMP = new Date().toISOString().slice(0, 10);
const OUTPUT_ROOT = path.join(ROOT, "output", `mekorhabracha-site-export-${RUN_STAMP}`);

function detectKind(url: string): UrlKind {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".pdf")) return "pdf";
  if (pathname.endsWith(".docx")) return "docx";
  if (pathname.endsWith(".xml")) return "xml";
  if (pathname.endsWith(".html") || pathname === "/" || !pathname.includes(".")) return "html";
  return "other";
}

function slugify(url: string, index: number): string {
  const parsed = new URL(url);
  const joined = `${parsed.hostname}${parsed.pathname === "/" ? "/home" : parsed.pathname}${parsed.search}`.replace(
    /\/+/g,
    "/",
  );
  const slug = joined
    .replace(/^\/+/, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/\//g, "__")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .toLowerCase();
  return `${String(index).padStart(3, "0")}__${slug || "home"}`;
}

function markdownEscape(value: string): string {
  return value.replace(/\\/g, "\\\\");
}

async function loadUrls(urlListPath: string): Promise<string[]> {
  const raw = await readFile(urlListPath, "utf8");
  return [...new Set(raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
}

async function ensureCleanDir(targetDir: string): Promise<void> {
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
}

async function downloadToFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

async function runTextCommand(command: string, args: string[]): Promise<string> {
  const { stdout } = await execFile(command, args, { maxBuffer: 20 * 1024 * 1024 });
  return stdout.trim();
}

async function extractPdfText(sourceFile: string): Promise<string> {
  return runTextCommand("pdftotext", ["-layout", sourceFile, "-"]);
}

async function extractDocxText(sourceFile: string): Promise<string> {
  return runTextCommand("textutil", ["-convert", "txt", "-stdout", sourceFile]);
}

async function extractHtmlPage(
  browser: Browser,
  url: string,
  outputDir: string,
  pageIndex: number,
): Promise<Omit<ManifestEntry, "index" | "url" | "slug" | "kind" | "outputDir">> {
  const writeExtractedHtml = async (result: {
    title: string;
    metaDescription: string;
    headings: string[];
    bodyText: string;
    links: Array<{ text: string; href: string }>;
    html: string;
  }) => {
    const htmlFile = path.join(outputDir, "rendered.html");
    const contentFile = path.join(outputDir, "content.md");
    const linksFile = path.join(outputDir, "links.json");

    await writeFile(htmlFile, result.html);
    await writeFile(linksFile, `${JSON.stringify(result.links, null, 2)}\n`);

    const markdown = [
      `# ${result.title || `Page ${pageIndex}`}`,
      "",
      `- URL: ${url}`,
      `- Title: ${result.title || ""}`,
      `- Meta description: ${markdownEscape(result.metaDescription)}`,
      `- Extracted on: ${new Date().toISOString()}`,
      "",
      "## Headings",
      "",
      ...(result.headings.length ? result.headings.map((heading) => `- ${markdownEscape(heading)}`) : ["- None"]),
      "",
      "## Body Text",
      "",
      "```text",
      result.bodyText || "",
      "```",
      "",
    ].join("\n");

    await writeFile(contentFile, markdown);

    return {
      status: "ok" as const,
      title: result.title,
      contentFile: path.basename(contentFile),
      htmlFile: path.basename(htmlFile),
    };
  };

  const page = await browser.newPage();
  try {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.setViewportSize({ width: 1440, height: 2200 });
      await page.waitForTimeout(2_000);
      const result = await page.evaluate(() => {
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
        const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
          .map((node) => node.textContent?.trim() ?? "")
          .filter(Boolean);
        const bodyText = document.body?.innerText?.replace(/\n{3,}/g, "\n\n").trim() ?? "";
        const links = Array.from(document.querySelectorAll("a[href]"))
          .map((node) => ({
            text: node.textContent?.trim() ?? "",
            href: (node as HTMLAnchorElement).href,
          }))
          .filter((item) => item.href);
        return {
          title: document.title?.trim() ?? "",
          metaDescription,
          headings,
          bodyText,
          links,
          html: document.documentElement.outerHTML,
        };
      });

      return writeExtractedHtml(result);
    } catch {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      const $ = load(html);
      $("script, style, noscript").remove();
      const bodyText = $("body").text().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      const headings = $("h1,h2,h3,h4,h5,h6")
        .map((_, element) => $(element).text().trim())
        .get()
        .filter(Boolean);
      const links = $("a[href]")
        .map((_, element) => ({
          text: $(element).text().trim(),
          href: new URL($(element).attr("href") ?? "", url).href,
        }))
        .get()
        .filter((item) => item.href);
      return writeExtractedHtml({
        title: $("title").text().trim(),
        metaDescription: $('meta[name="description"]').attr("content") ?? "",
        headings,
        bodyText,
        links,
        html,
      });
    }
  } finally {
    await page.close();
  }
}

async function extractBinaryDocument(
  url: string,
  outputDir: string,
  kind: Extract<UrlKind, "pdf" | "docx" | "xml" | "other">,
): Promise<Omit<ManifestEntry, "index" | "url" | "slug" | "kind" | "outputDir">> {
  const parsed = new URL(url);
  const ext = path.extname(parsed.pathname) || (kind === "xml" ? ".xml" : ".bin");
  const sourceFile = path.join(outputDir, `source${ext}`);
  await downloadToFile(url, sourceFile);

  let extractedText = "";
  let contentFile = "";

  if (kind === "pdf") {
    extractedText = await extractPdfText(sourceFile);
    contentFile = path.join(outputDir, "content.txt");
    await writeFile(contentFile, `${extractedText}\n`);
  } else if (kind === "docx") {
    extractedText = await extractDocxText(sourceFile);
    contentFile = path.join(outputDir, "content.txt");
    await writeFile(contentFile, `${extractedText}\n`);
  } else if (kind === "xml") {
    extractedText = await readFile(sourceFile, "utf8");
    contentFile = path.join(outputDir, "content.xml");
    await writeFile(contentFile, extractedText);
  }

  return {
    status: "ok",
    title: path.basename(parsed.pathname) || parsed.hostname,
    sourceFile: path.basename(sourceFile),
    contentFile: contentFile ? path.basename(contentFile) : undefined,
  };
}

async function writeTopLevelIndex(entries: ManifestEntry[]): Promise<void> {
  const indexPath = path.join(OUTPUT_ROOT, "INDEX.md");
  const lines = [
    "# Mekor Habracha Site Export",
    "",
    `- Source list: ${path.relative(ROOT, DEFAULT_URL_LIST)}`,
    `- Exported on: ${new Date().toISOString()}`,
    `- Total URLs: ${entries.length}`,
    `- Successful exports: ${entries.filter((entry) => entry.status === "ok").length}`,
    "",
    "## Pages",
    "",
    "| # | Kind | Title | URL | Folder | Status |",
    "|---|------|-------|-----|--------|--------|",
    ...entries.map((entry) => {
      const folder = path.relative(OUTPUT_ROOT, entry.outputDir);
      return `| ${entry.index} | ${entry.kind} | ${entry.title ?? ""} | ${entry.url} | ${folder} | ${entry.status} |`;
    }),
    "",
  ];
  await writeFile(indexPath, `${lines.join("\n")}\n`);
}

async function main(): Promise<void> {
  const urlListPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_URL_LIST;
  const urls = await loadUrls(urlListPath);
  await ensureCleanDir(OUTPUT_ROOT);

  const entries: ManifestEntry[] = [];
  const browser = await chromium.launch({ headless: true });

  try {
    for (const [offset, url] of urls.entries()) {
      const index = offset + 1;
      const kind = detectKind(url);
      const slug = slugify(url, index);
      const outputDir = path.join(OUTPUT_ROOT, slug);
      await mkdir(outputDir, { recursive: true });
      process.stdout.write(`${String(index).padStart(3, "0")}/${urls.length} START ${url}\n`);

      const entry: ManifestEntry = {
        index,
        url,
        slug,
        kind,
        status: "error",
        outputDir,
      };

      try {
        const details =
          kind === "html"
            ? await extractHtmlPage(browser, url, outputDir, index)
            : await extractBinaryDocument(url, outputDir, kind);
        Object.assign(entry, details);
      } catch (error) {
        entry.error = error instanceof Error ? error.message : String(error);
        await writeFile(path.join(outputDir, "error.txt"), `${entry.error}\n`);
      }

      entries.push(entry);
      process.stdout.write(`${String(index).padStart(3, "0")}/${urls.length} ${entry.status.toUpperCase()} ${url}\n`);
    }
  } finally {
    await browser.close();
  }

  await writeFile(path.join(OUTPUT_ROOT, "manifest.json"), `${JSON.stringify(entries, null, 2)}\n`);
  await writeTopLevelIndex(entries);

  const summary = {
    outputRoot: OUTPUT_ROOT,
    total: entries.length,
    ok: entries.filter((entry) => entry.status === "ok").length,
    errors: entries.filter((entry) => entry.status === "error").length,
  };
  await writeFile(path.join(OUTPUT_ROOT, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  const outputStats = await stat(path.join(OUTPUT_ROOT, "manifest.json"));
  process.stdout.write(`Export complete. Manifest bytes: ${outputStats.size}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
