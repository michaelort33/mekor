import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const SOURCE_SITE_URL = "https://www.mekorhabracha.org";
const SITE_URL = SOURCE_SITE_URL;
const SOURCE_HOSTS = new Set(["www.mekorhabracha.org", "mekorhabracha.org"]);

export const REPO_ROOT = process.cwd();
export const MIRROR_DIR = path.join(REPO_ROOT, "mirror-data");
export const ROUTES_DIR = path.join(MIRROR_DIR, "routes");
export const RAW_DIR = path.join(MIRROR_DIR, "raw");
export const SNAPSHOT_DIR = path.join(RAW_DIR, "snapshots");
export const CONTENT_DIR = path.join(MIRROR_DIR, "content");
export const SEO_DIR = path.join(MIRROR_DIR, "seo");
export const SEARCH_DIR = path.join(MIRROR_DIR, "search");
export const ASSETS_DIR = path.join(MIRROR_DIR, "assets");

export async function ensureMirrorDirs() {
  await Promise.all([
    fs.mkdir(ROUTES_DIR, { recursive: true }),
    fs.mkdir(SNAPSHOT_DIR, { recursive: true }),
    fs.mkdir(CONTENT_DIR, { recursive: true }),
    fs.mkdir(SEO_DIR, { recursive: true }),
    fs.mkdir(SEARCH_DIR, { recursive: true }),
    fs.mkdir(ASSETS_DIR, { recursive: true }),
  ]);
}

export function normalizePath(raw: string) {
  if (!raw) {
    return "/";
  }

  const value = raw.trim();
  const withSlash = value.startsWith("/") ? value : `/${value}`;
  const [pathname, query = ""] = withSlash.split("?");
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";

  if (!query) {
    return cleanPath;
  }

  return `${cleanPath}?${query}`;
}

export function parseSiteUrl(raw: string) {
  try {
    const url = new URL(raw, SITE_URL);
    if (!(url.hostname === "www.mekorhabracha.org" || url.hostname.endsWith(".mekorhabracha.org"))) {
      return null;
    }

    const value = `${url.pathname}${url.search}`;
    return normalizePath(value);
  } catch {
    return null;
  }
}

export function toAbsoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, SITE_URL).toString();
}

export function toLocalMirrorPath(pathOrUrl: string) {
  try {
    const parsed = new URL(pathOrUrl, SITE_URL);
    if (!SOURCE_HOSTS.has(parsed.hostname)) {
      return pathOrUrl;
    }

    const basePath = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "") || "/";
    return `${basePath}${parsed.search}${parsed.hash}`;
  } catch {
    return pathOrUrl;
  }
}

export function isSourceHost(pathOrUrl: string) {
  try {
    const parsed = new URL(pathOrUrl, SITE_URL);
    return SOURCE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export async function readLines(filePath: string) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function isLikelyFilePath(pathValue: string) {
  const pathname = pathValue.split("?")[0].toLowerCase();
  return /\.(pdf|doc|docx|jpg|jpeg|png|gif|webp|svg|ico|xml|json|txt|css|js|map|zip|rar|7z|mp4|mp3|mov|avi|m4a|webm|woff|woff2|ttf|otf|eot)$/.test(
    pathname,
  );
}

export function parseCsvLine(line: string) {
  const values: string[] = [];
  let cursor = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cursor += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      values.push(cursor);
      cursor = "";
      continue;
    }

    cursor += ch;
  }

  values.push(cursor);
  return values;
}

export async function readCsv(filePath: string) {
  const lines = await readLines(filePath);
  if (lines.length === 0) {
    return [] as Array<Record<string, string>>;
  }

  const [headerLine, ...rows] = lines;
  const headers = parseCsvLine(headerLine);

  return rows
    .map((line) => parseCsvLine(line))
    .map((cols) => {
      const record: Record<string, string> = {};
      for (let i = 0; i < headers.length; i += 1) {
        record[headers[i]] = cols[i] ?? "";
      }
      return record;
    });
}

export async function writeJson(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function hashSha1(input: string | Buffer) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

export function slugFromPath(pathValue: string) {
  if (pathValue === "/") {
    return "home";
  }

  return pathValue
    .replace(/^\//, "")
    .replace(/\?/g, "--")
    .replace(/[&=]/g, "-")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/\//g, "__")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .toLowerCase();
}

export function classifyDocumentType(pathValue: string) {
  if (pathValue === "/") {
    return "page" as const;
  }

  if (pathValue.startsWith("/post/")) {
    return "post" as const;
  }

  if (pathValue.startsWith("/news/")) {
    return "news" as const;
  }

  if (pathValue.startsWith("/events-1/")) {
    return "event" as const;
  }

  if (pathValue.startsWith("/kosher-posts/categories/")) {
    return "category" as const;
  }

  if (pathValue.startsWith("/kosher-posts/tags/")) {
    return "tag" as const;
  }

  if (pathValue.startsWith("/profile/")) {
    return "profile" as const;
  }

  return "page" as const;
}

export function guessContentTypeFromName(name: string) {
  const lower = name.toLowerCase();

  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".xml")) return "application/xml";
  if (lower.endsWith(".txt")) return "text/plain";

  return "application/octet-stream";
}
