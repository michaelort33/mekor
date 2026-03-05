export function normalizeNavigationPath(path: string) {
  if (!path) {
    return "/";
  }

  if (path === "/") {
    return "/";
  }

  return path.endsWith("/") ? path.slice(0, -1) : path;
}

export function isNavigationPathActive(currentPath: string, targetPath: string) {
  const current = normalizeNavigationPath(currentPath);
  const target = normalizeNavigationPath(targetPath);

  if (target === "/") {
    return current === target;
  }

  return current === target || current.startsWith(`${target}/`);
}
