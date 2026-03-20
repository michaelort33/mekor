export type NavLink = {
  label: string;
  href: string;
  tone?: "default" | "cta";
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

export const SUPPORT_MEKOR_LINK = {
  label: "Support Mekor",
  href: "/donations",
} as const;

export const SITE_MENU: NavItem[] = [
  {
    label: "Davening",
    href: "/davening",
  },
  {
    label: "Become a Member",
    href: "/membership",
    children: [
      { label: "Membership Overview", href: "/membership" },
      { label: "Apply for Membership", href: "/membership/apply" },
      { label: "Auxiliary & Alumni Membership", href: "/auxiliary-membership" },
    ],
  },
  {
    label: "Events",
    href: "/events",
  },
  {
    label: "Beit Midrash",
    href: "/center-city-beit-midrash",
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
    ],
  },
  {
    label: "Kosher Guide",
    href: "/center-city",
    children: [
      { label: "Center City & Vicinity", href: "/center-city" },
      { label: "Main Line/Manyunk", href: "/main-line-manyunk" },
      { label: "Old York Road/Northeast", href: "/old-yorkroad-northeast" },
      { label: "Cherry Hill", href: "/cherry-hill" },
      { label: "Kosher Map", href: "/kosher-map" },
    ],
  },
  {
    label: "More",
    href: "/community",
    children: [
      { label: "Member Hub", href: "/account" },
      { label: "Dues & payments", href: "/account/dues" },
      { label: "Members directory", href: "/members" },
      { label: "Community directory", href: "/community" },
      { label: "Your profile", href: "/account/profile" },
      { label: "Kiddush", href: "/kiddush" },
      { label: "Volunteer", href: "/team-4" },
      { label: "Mekor Bulletin Board", href: "/mekor-bulletin-board" },
      { label: "Ask Mekor", href: "/ask-mekor" },
      { label: "Israel", href: "/israel" },
      { label: "Testimonials", href: "/testimonials" },
      { label: "Mekor Couples", href: "/mekorcouples" },
      { label: "Philly Jewish Community", href: "/philly-jewish-community" },
    ],
  },
];
