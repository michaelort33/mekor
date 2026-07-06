/**
 * Content paths that have been pulled from the public site but still exist in
 * the underlying data (DB rows, mirror documents, search index).
 *
 * Listing a path here hides it everywhere the site renders or links content —
 * the kosher directory, the /post article route, and site search — without
 * requiring a database migration or a content re-sync. Use this for takedowns
 * such as a kosher establishment whose supervision has ended.
 */
export const HIDDEN_CONTENT_PATHS = new Set<string>([
  "/post/shalom-pizza", // Shalom Pizza — removed from the kosher directory.
]);

export function isHiddenContentPath(path: string | null | undefined): boolean {
  return path ? HIDDEN_CONTENT_PATHS.has(path) : false;
}
