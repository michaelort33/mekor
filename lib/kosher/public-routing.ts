const CATEGORY_TO_NEIGHBORHOOD: Record<string, string> = {
  "center-city": "center-city",
  "main-line-manyunk": "main-line-manyunk",
  "cherry-hill": "cherry-hill",
  "old-york-road-northeast": "old-yorkroad-northeast",
};

export function buildKosherCategoryRedirect(slug: string) {
  const params = new URLSearchParams();
  const neighborhood = CATEGORY_TO_NEIGHBORHOOD[slug];

  if (neighborhood) {
    params.set("neighborhood", neighborhood);
  }

  const query = params.toString();
  return query ? `/center-city?${query}#directory` : "/center-city#directory";
}

export function buildKosherTagRedirect(slug: string) {
  const params = new URLSearchParams();

  if (slug && slug !== "all") {
    params.set("category", slug);
  }

  const query = params.toString();
  return query ? `/center-city?${query}#directory` : "/center-city#directory";
}
