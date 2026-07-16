export type KosherPlaceCorrection = {
  slug: string;
  title: string;
  summary: string;
  tagPaths: string[];
};

const KOSHER_PLACE_CORRECTIONS: Record<string, KosherPlaceCorrection> = {
  "/post/say-she-ate-caf%C3%A9": {
    slug: "say-she-ate",
    title: "Say She Ate",
    summary: "Mumbai-inspired vegan restaurant. Tue-Sun 11 AM-9 PM; closed Monday.",
    tagPaths: ["/kosher-posts/tags/restaurants"],
  },
};

export function getKosherPlaceCorrection(path: string) {
  return KOSHER_PLACE_CORRECTIONS[path] ?? null;
}
