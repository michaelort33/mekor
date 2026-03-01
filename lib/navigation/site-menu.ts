export type NavLink = {
  label: string;
  href: string;
};

export type NavGroup = NavLink & {
  children: NavLink[];
};

export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

export const JOIN_US_LINK = {
  label: "Join Us",
  href: "https://chat.whatsapp.com/G7JTiUN3aPN1V09lbBLC7G",
} as const;

export const SITE_MENU: NavItem[] = [
  {
    label: "Membership",
    href: "/membership",
  },
  {
    label: "Events",
    href: "/events",
  },
  {
    label: "Donate",
    href: "/donations",
  },
  {
    label: "Kiddush",
    href: "/kiddush",
  },
  {
    label: "Who We Are",
    href: "/about-us",
    children: [
      { label: "About Us", href: "/about-us" },
      { label: "Our Leadership", href: "/our-leadership" },
      { label: "Our Rabbis", href: "/our-rabbi" },
      { label: "Visit Us", href: "/visit-us" },
      { label: "Contact Us", href: "/contact-us" },
      { label: "In The News", href: "/in-the-news" },
      { label: "Our Community", href: "/our-communities" },
      { label: "From The Rabbi's Desk", href: "/from-the-rabbi-s-desk" },
      { label: "Philly Jewish Community", href: "/philly-jewish-community" },
    ],
  },
  {
    label: "Kosher Restaurants",
    href: "/center-city",
    children: [
      { label: "Center City & Vicinity", href: "/center-city" },
      { label: "Main Line/Manyunk", href: "/main-line-manyunk" },
      { label: "Old York Road/Northeast", href: "/old-yorkroad-northeast" },
      { label: "Cherry Hill", href: "/cherry-hill" },
    ],
  },
  {
    label: "More",
    href: "/our-communities",
    children: [
      { label: "Auxiliary & Alumni Membership", href: "/auxiliary-membership" },
      { label: "Center City Beit Midrash", href: "/center-city-beit-midrash" },
      { label: "Davening", href: "/davening" },
      { label: "Kosher Map", href: "/kosher-map" },
      { label: "Volunteer", href: "/team-4" },
      { label: "Mekor Bulletin Board", href: "/mekor-bulletin-board" },
      { label: "Israel", href: "/israel" },
      { label: "Testimonials", href: "/testimonials" },
      { label: "Mekor Couples", href: "/mekorcouples" },
    ],
  },
];
