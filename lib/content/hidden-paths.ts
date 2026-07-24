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
  "/post/goldie", // Goldie — Midtown Village.
  "/post/goldie-2", // Goldie — Whole Foods.
  "/post/goldie-3", // Goldie — Franklin's Table.
  "/post/goldie-4", // Goldie — retired multi-location listing.
  "/post/hipcityveg-1", // HipCityVeg — closed 40th Street location.
  "/post/_luhv", // LUHV N York Road — duplicate Hatboro listing, not Center City.
  "/post/c-r-kitchen", // C&R Kitchen — permanently closed.
  "/post/c-r-kitchen-1", // C&R Kitchen — duplicate permanently closed listing.
  "/post/new-york-bagel", // New York Bagel — duplicate of New York Bagel Bakery.
  "/post/the-chilly-banana", // The Chilly Banana — permanently closed.
]);

export function isHiddenContentPath(path: string | null | undefined): boolean {
  return path ? HIDDEN_CONTENT_PATHS.has(path) : false;
}
