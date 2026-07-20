export type NavLink = {
  label: string;
  href: string;
  note?: string;
};

export type NavColumn = {
  title: string;
  highlight?: boolean;
  links: NavLink[];
};

export type NavGroup = NavLink & {
  children: NavLink[];
  /** Optional richer dropdown layout; falls back to `children` when absent. */
  columns?: NavColumn[];
  triggerOnly?: boolean;
};

export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

export const JOIN_US_LINK = {
  label: "Join WhatsApp",
  href: "https://chat.whatsapp.com/G7JTiUN3aPN1V09lbBLC7G",
} as const;

export const SUPPORT_MEKOR_LINK = {
  label: "Donate",
  href: "/donations",
} as const;

export const KIDDUSH_LINK = {
  label: "Sponsor a Kiddush",
  href: "/kiddush",
} as const;

/** Split-button dropdown next to Donate. */
export const GIVE_MENU: NavLink[] = [
  { label: "Donate to Mekor", href: "/donations" },
  { label: KIDDUSH_LINK.label, href: KIDDUSH_LINK.href, note: "Celebrate a simcha with the community" },
];

/** Members-only links — rendered behind Dashboard / the drawer's Members strip, never in the public nav. */
export const MEMBERS_MENU: NavLink[] = [
  { label: "Member Hub", href: "/account" },
  { label: "Dues & payments", href: "/account/dues" },
  { label: "Members directory", href: "/members" },
  { label: "Community directory", href: "/community" },
  { label: "Your profile", href: "/account/profile" },
];

/** Mobile drawer quick-tile grid (top of drawer). */
export const QUICK_TILES: NavLink[] = [
  { label: "Davening", href: "/davening", note: "Service times" },
  { label: "Events", href: "/events", note: "What's coming up" },
  { label: "Kosher Guide", href: "/center-city", note: "Philly area dining" },
  { label: "Visit Us", href: "/visit-us", note: "Plan your first Shabbat" },
];

const MEMBERSHIP_MENU: NavGroup = {
  label: "Membership",
  href: "/membership",
  children: [
    { label: "Membership Overview", href: "/membership" },
    { label: "Apply for Membership", href: "/membership/apply" },
    { label: "Auxiliary & Alumni Membership", href: "/auxiliary-membership" },
    { label: "Mekor Couples", href: "/mekorcouples" },
  ],
};

const KOSHER_GUIDE_COLUMNS: NavColumn[] = [
  {
    title: "Neighborhoods",
    links: [
      { label: "Center City & Vicinity", href: "/center-city" },
      { label: "Main Line/Manyunk", href: "/main-line-manyunk" },
      { label: "Old York Road/Northeast", href: "/old-yorkroad-northeast" },
      { label: "Cherry Hill", href: "/cherry-hill" },
    ],
  },
  {
    title: "Tools",
    links: [{ label: "Kosher Map", href: "/kosher-map", note: "Every certified spot, on one map" }],
  },
];

const KOSHER_GUIDE_MENU: NavGroup = {
  label: "Kosher Guide",
  href: "/center-city",
  children: KOSHER_GUIDE_COLUMNS.flatMap((column) => column.links),
  columns: KOSHER_GUIDE_COLUMNS,
};

const WHO_WE_ARE_COLUMNS: NavColumn[] = [
  {
    title: "Who we are",
    links: [
      { label: "About Us", href: "/about-us" },
      { label: "Our Rabbis", href: "/our-rabbis" },
      { label: "Our Leadership", href: "/our-leadership" },
      { label: "Our Community", href: "/our-communities" },
      { label: "In The News", href: "/in-the-news" },
      { label: "From The Rabbi's Desk", href: "/from-the-rabbi-s-desk" },
    ],
  },
  {
    title: "Plan a visit",
    highlight: true,
    links: [
      { label: "Visit Us", href: "/visit-us", note: "Location, parking & what to expect" },
      { label: "Contact Us", href: "/contact-us", note: "Reach the office or the rabbi" },
    ],
  },
];

const WHO_WE_ARE_MENU: NavGroup = {
  label: "Who We Are",
  href: "/about-us",
  children: WHO_WE_ARE_COLUMNS.flatMap((column) => column.links),
  columns: WHO_WE_ARE_COLUMNS,
};

const COMMUNITY_COLUMNS: NavColumn[] = [
  {
    title: "Learning",
    links: [
      { label: "Beit Midrash", href: "/center-city-beit-midrash", note: "Center City Beit Midrash" },
      { label: "Ask Mekor", href: "/ask-mekor" },
    ],
  },
  {
    title: "Community life",
    links: [
      { label: "Bulletin Board", href: "/mekor-bulletin-board" },
      { label: "Volunteer", href: "/team-4" },
      { label: "Israel", href: "/israel" },
      { label: "Past Newsletters", href: "/newsletters" },
      { label: "Testimonials", href: "/testimonials" },
      { label: "Philly Jewish Community", href: "/philly-jewish-community" },
    ],
  },
];

const COMMUNITY_MENU: NavGroup = {
  label: "Community",
  href: "/community-life",
  triggerOnly: true,
  children: COMMUNITY_COLUMNS.flatMap((column) => column.links),
  columns: COMMUNITY_COLUMNS,
};

export const SITE_MENU: NavItem[] = [
  { label: "Davening", href: "/davening" },
  { label: "Events", href: "/events" },
  MEMBERSHIP_MENU,
  KOSHER_GUIDE_MENU,
  WHO_WE_ARE_MENU,
  COMMUNITY_MENU,
];

/** Mobile drawer accordion groups (below quick tiles + Give + WhatsApp). */
export const MOBILE_GROUPS: NavGroup[] = [
  MEMBERSHIP_MENU,
  WHO_WE_ARE_MENU,
  COMMUNITY_MENU,
];
