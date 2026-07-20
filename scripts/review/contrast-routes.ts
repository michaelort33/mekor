export type ContrastBreakpoint = {
  name: "mobile" | "desktop";
  width: number;
  height: number;
};

export type InteractiveStateId =
  | "default"
  | "mobile-drawer"
  | "give-menu"
  | "feedback-sheet";

export type InteractiveState = {
  id: InteractiveStateId;
  /** Routes this interaction should run on. Empty = all routes (rarely used). */
  routes: string[];
  /** Breakpoints that make sense for this interaction. */
  breakpoints: Array<ContrastBreakpoint["name"]>;
  description: string;
};

/**
 * Curated public marketing/auth routes for contrast crawling.
 * Seeded from scripts/audit-overflow-sweep.mjs plus a few high-traffic pages.
 */
export const PUBLIC_CONTRAST_ROUTES = [
  "/",
  "/about-us",
  "/our-rabbis",
  "/our-leadership",
  "/leadership",
  "/our-communities",
  "/philly-jewish-community",
  "/davening",
  "/visit-us",
  "/contact-us",
  "/donations",
  "/membership",
  "/membership/apply",
  "/auxiliary-membership",
  "/login",
  "/signup",
  "/forgot-password",
  "/search",
  "/events",
  "/kiddush",
  "/from-the-rabbi-s-desk",
  "/in-the-news",
  "/israel",
  "/mekor-bulletin-board",
  "/mekorcouples",
  "/testimonials",
  "/team-4",
  "/community",
  "/center-city",
  "/cherry-hill",
  "/main-line-manyunk",
  "/old-yorkroad-northeast",
  "/old-kosher-restaurants",
  "/kosher-map",
  "/ask-mekor",
  "/newsletters",
  "/general-5",
  "/center-city-beit-midrash",
] as const;

export const CONTRAST_BREAKPOINTS: ContrastBreakpoint[] = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

export const INTERACTIVE_STATES: InteractiveState[] = [
  {
    id: "default",
    routes: [...PUBLIC_CONTRAST_ROUTES],
    breakpoints: ["mobile", "desktop"],
    description: "Default page load",
  },
  {
    id: "mobile-drawer",
    routes: ["/"],
    breakpoints: ["mobile"],
    description: "Homepage with mobile nav drawer open",
  },
  {
    id: "give-menu",
    routes: ["/"],
    breakpoints: ["desktop"],
    description: "Homepage with desktop Give/Donate menu open",
  },
  {
    id: "feedback-sheet",
    routes: ["/"],
    breakpoints: ["desktop", "mobile"],
    description: "Homepage with site feedback sheet open",
  },
];

export function resolveContrastRoutes(): string[] {
  const raw = process.env.CONTRAST_CRAWL_ROUTES?.trim();
  if (!raw) {
    return [...PUBLIC_CONTRAST_ROUTES];
  }
  return [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => (part.startsWith("/") ? part : `/${part}`)),
    ),
  ];
}
