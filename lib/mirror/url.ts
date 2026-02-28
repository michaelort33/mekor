import { SITE_URL } from "@/lib/mirror/paths";

export function normalizePath(rawPath: string) {
  if (!rawPath || rawPath === "") {
    return "/";
  }

  const input = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const [pathname, query = ""] = input.split("?");
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";

  if (!query) {
    return cleanPath;
  }

  return `${cleanPath}?${query}`;
}

export function getPathVariants(pathValue: string) {
  const normalized = normalizePath(pathValue);
  const [pathname, query = ""] = normalized.split("?");
  const variants = new Set<string>([normalized]);

  const add = (candidatePathname: string) => {
    const clean = normalizePath(query ? `${candidatePathname}?${query}` : candidatePathname);
    variants.add(clean);
  };

  try {
    add(decodeURI(pathname));
  } catch {
    // keep default variant only when URI is malformed
  }

  try {
    add(encodeURI(pathname));
  } catch {
    // keep default variant only when URI is malformed
  }

  return [...variants];
}

export function urlToPath(url: string) {
  const parsed = new URL(url, SITE_URL);
  const query = parsed.search || "";
  return normalizePath(`${parsed.pathname}${query}`);
}

export function toAbsoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, SITE_URL).toString();
}

export function slugFromPath(path: string) {
  if (path === "/") {
    return "home";
  }

  return path
    .replace(/^\//, "")
    .replace(/\?/g, "--")
    .replace(/[&=]/g, "-")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/\//g, "__")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .toLowerCase();
}

export function isLikelyFilePath(path: string) {
  const pathname = path.split("?")[0].toLowerCase();
  return /\.(pdf|doc|docx|jpg|jpeg|png|gif|webp|svg|ico|xml|json|txt|css|js|map|zip|rar|7z|mp4|mp3|mov|avi|m4a|webm|woff|woff2|ttf|otf|eot)$/.test(
    pathname,
  );
}
