import type { ManagedKosherPlace } from "@/lib/kosher/store";

export const MANUAL_KOSHER_PLACES: ManagedKosherPlace[] = [
  {
    slug: "sababa-falafel",
    path: "/post/sababa-falafel",
    title: "Sababa Falafel",
    neighborhood: "main-line-manyunk",
    neighborhoodLabel: "Main Line / Manyunk",
    heroImage: "https://static.wixstatic.com/media/e4ef73_73d5b8c8949f4815b5b5c2d599875fdf~mv2.jpg",
    tags: ["Restaurants"],
    categoryPaths: ["/kosher-posts/categories/main-line-manyunk"],
    tagPaths: ["/kosher-posts/tags/restaurants"],
    address: "123 Old Lancaster Road, Bala Cynwyd, PA 19004",
    phone: "+12673177709",
    website: "https://www.sababafalafelphilly.com/",
    supervision: "Under Keystone-K Supervision",
    summary: "Falafel and Middle Eastern restaurant",
    locationHref: "https://www.google.com/maps/search/?api=1&query=123+Old+Lancaster+Road+Bala+Cynwyd+PA+19004",
    certificateHref: "https://keystone-k.org/",
    certificateLabel: "Certification page",
    sourceCapturedAt: "2026-07-24T00:00:00.000Z",
  },
  {
    slug: "chalavita",
    path: "/post/chalavita",
    title: "Chalavita",
    neighborhood: "old-yorkroad-northeast",
    neighborhoodLabel: "Old York Road / Northeast",
    heroImage: "https://chalavita.com/wp-content/themes/sweet-mazaltov-wp-theme/assets/img/chalavita-flyer.jpeg",
    tags: ["Catering", "Dairy"],
    categoryPaths: ["/kosher-posts/categories/old-york-road-northeast"],
    tagPaths: ["/kosher-posts/tags/restaurants"],
    address: "Northeast Philadelphia, PA 19116",
    phone: "+19296661482",
    website: "https://chalavita.com/",
    supervision: "Under Keystone-K Supervision",
    summary: "Cholov Yisroel and Pas Yisroel dairy catering",
    locationHref: "",
    certificateHref: "https://chalavita.com/wp-content/themes/sweet-mazaltov-wp-theme/assets/img/chalavita-kashrus-cert.jpg",
    certificateLabel: "Certificate",
    sourceCapturedAt: "2026-07-24T00:00:00.000Z",
  },
];

const PLACE_OVERRIDES: Record<string, Partial<ManagedKosherPlace>> = {
  "/post/the-brazillan-bbq": {
    supervision: "Under Keystone-K Supervision",
  },
  "/post/that-sushi-spot-lkwd-nj-lakewood": {
    title: "That Sushi Spot - LKWD NJ",
  },
};

export function applyKosherPlaceOverride(place: ManagedKosherPlace): ManagedKosherPlace {
  return { ...place, ...PLACE_OVERRIDES[place.path] };
}

export function getManualKosherPlace(path: string) {
  return MANUAL_KOSHER_PLACES.find((place) => place.path === path) ?? null;
}
