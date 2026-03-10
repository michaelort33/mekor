export const KOSHER_NEIGHBORHOODS = [
  "center-city",
  "main-line-manyunk",
  "old-yorkroad-northeast",
  "cherry-hill",
  "unknown",
] as const;

export type KosherNeighborhood = (typeof KOSHER_NEIGHBORHOODS)[number];

export const KOSHER_NEIGHBORHOOD_LABELS: Record<KosherNeighborhood, string> = {
  "center-city": "Center City & Vicinity",
  "main-line-manyunk": "Main Line / Manyunk",
  "old-yorkroad-northeast": "Old York Road / Northeast",
  "cherry-hill": "Cherry Hill",
  unknown: "Other",
};
