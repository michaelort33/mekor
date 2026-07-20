export type BulletinLink = {
  label: string;
  href: string;
};

export type BulletinTone = "default" | "urgent" | "featured" | "support";

export type BulletinIcon =
  | "tot"
  | "davening"
  | "membership"
  | "hebrew"
  | "wine"
  | "israel"
  | "volunteer"
  | "yizkor"
  | "eruv"
  | "mikvah"
  | "class"
  | "community"
  | "notary"
  | "career"
  | "health"
  | "matchmaking";

export type BulletinCard = {
  title: string;
  paragraphs: string[];
  links: BulletinLink[];
  eyebrow?: string;
  tone?: BulletinTone;
  image?: {
    src: string;
    alt: string;
    aspect?: "banner" | "flyer" | "square" | "wide";
  };
  icon?: BulletinIcon;
  ribbon?: string;
};

export const PATH = "/mekor-bulletin-board" as const;

export const BOARD_IMAGES = {
  hero: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/c2c6235de9c6d719cd098e19d77b7f21c18899f1-11062b_8135b27108d04d2a97adc750a341fb79-mv2.jpeg",
  davening:
    "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/b562092e8484e9d5c6e62671c670e606b2d338cc-92f487_34e64b1fb2e94c56886578290ef2bcd0-mv2.jpeg",
  jerusalem:
    "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/6232f3d6a49758d6fe2d88551b5e72e6b5861a20-banner.jpg",
  logo: "/newsletters/archive/assets/238810f8b9cd-75d082cb-45f0-420c-95dd-3f153937e7ef.png",
  shabbatBanner: "/newsletters/archive/assets/01b4787397a5-210e849f-0dff-f50d-8135-5cfaa09eb671.png",
  weekdaysBanner: "/newsletters/archive/assets/47336a43df3d-b5a03dc5-f2eb-209c-827e-02771fe762b5.png",
  volunteersBanner: "/newsletters/archive/assets/0edff6a4f916-239cd781-49f2-2aa8-92d7-7eb7a6d7091e.png",
  zionismFlyer: "/newsletters/archive/assets/58eaddb0bbcf-87e0abbc-a2e4-d1d2-038b-8c0682c56128.png",
  israelFlag: "/newsletters/archive/assets/23882a236001-bfb69b9c-c1c0-4a73-bf44-92ffd837623e.jpg",
} as const;

export const ERUV_DONATION_LINK =
  "https://ccshul.us2.list-manage.com/track/click?u=f9fe87a16c42c24704c099073&id=78b2ea75cf&e=dac02e1995";

export const ERUV_CAMPAIGN_TEAM =
  "https://thechesedfund.com/centercityeruv/ep2026/teams/mekorhabracha";

export const ERUV_CAMPAIGN_INFO = "https://thechesedfund.com/centercityeruv/ep2026";

export const ZIONISM_CLASS_RSVP = "https://forms.gle/aDkUYeBj3qvudcMD9";

export const BOARD_NAV = [
  { label: "Featured", href: "#featured-now" },
  { label: "Standing info", href: "#standing-info" },
  { label: "Updates", href: "#community-updates" },
  { label: "Announcements", href: "#community-announcements" },
  { label: "Support", href: "#support-mekor" },
] as const;

/** Standing items that used to repeat every week in the Shabbat newsletter. */
export const STANDING_INFO: BulletinCard[] = [
  {
    title: "Tot Shabbat",
    eyebrow: "Families",
    icon: "tot",
    ribbon: "Shabbat @ Mekor",
    image: {
      src: BOARD_IMAGES.shabbatBanner,
      alt: "Shabbat at Mekor newsletter banner",
      aspect: "banner",
    },
    paragraphs: [
      "Mekor's Tot Shabbat meets about once a month — typically the last Shabbat of the English month around 11 AM — with parsha, songs, and stories for young children and families.",
    ],
    links: [
      { label: "Tot Shabbat details", href: "/events-1/mekors-tot-shabbat" },
      { label: "All events", href: "/events" },
    ],
  },
  {
    title: "Davening & Weekday Minyan",
    eyebrow: "Services",
    icon: "davening",
    ribbon: "Weekdays @ Mekor",
    image: {
      src: BOARD_IMAGES.weekdaysBanner,
      alt: "Weekdays at Mekor newsletter banner",
      aspect: "banner",
    },
    paragraphs: [
      "Find Shabbat and weekday service times, the minyan WhatsApp group, and RSVP notes for evening minyanim on the Davening page. Morning and evening weekday services are often followed by a brief halacha insight.",
    ],
    links: [
      { label: "Davening schedule", href: "/davening" },
      { label: "Email the shul about minyan", href: "mailto:mekorhabracha@gmail.com?subject=Minyan%20RSVP" },
    ],
  },
  {
    title: "Mekor Membership",
    eyebrow: "Join",
    icon: "membership",
    tone: "support",
    paragraphs: [
      "Join Mekor or renew your membership to support daily minyanim, Torah learning, and a welcoming Center City community.",
    ],
    links: [
      { label: "Membership overview", href: "/membership" },
      { label: "Apply for membership", href: "/membership/apply" },
    ],
  },
  {
    title: "Hebrew Help at Mekor",
    eyebrow: "Learning",
    icon: "hebrew",
    paragraphs: [
      "Parents can sign up children (up to age 18) to learn Hebrew, Torah reading, and/or tefillah skills with Mekor community tutors. We'll match each child with a tutor for a mutually convenient time.",
    ],
    links: [
      {
        label: "Email about Hebrew Help",
        href: "mailto:mekorhabracha@gmail.com?subject=Hebrew%20Help%20Sign-up",
      },
    ],
  },
  {
    title: "Kosher Wine & Judaica",
    eyebrow: "Affiliate",
    icon: "wine",
    tone: "support",
    paragraphs: [
      "When you order through Mekor's affiliate links for Kosherwine.com and Judaica.com, Mekor earns 5% back at no extra cost to you.",
    ],
    links: [
      { label: "Kosher wine (Mekor link)", href: "https://tinyurl.com/mekorwine" },
      { label: "Judaica (Mekor link)", href: "https://tinyurl.com/mekorjudaica" },
    ],
  },
  {
    title: "Support of Israel",
    eyebrow: "Israel",
    icon: "israel",
    image: {
      src: BOARD_IMAGES.israelFlag,
      alt: "Israeli flag",
      aspect: "wide",
    },
    paragraphs: [
      "Find community initiatives, civil-defense support opportunities, and related announcements on Mekor's Israel page. Torah writing from Rabbi Hirsch and Rabbi Gotlib is linked from their profiles and Substacks.",
    ],
    links: [
      { label: "Support of Israel", href: "/israel" },
      { label: "Rabbi Hirsch Substack", href: "https://rabbieliezerhirsch.substack.com/" },
      { label: "Rabbi Gotlib Substack", href: "https://rabbistevengotlib.substack.com/" },
    ],
  },
  {
    title: "Volunteer at Mekor",
    eyebrow: "Volunteer",
    icon: "volunteer",
    ribbon: "Volunteers Needed",
    image: {
      src: BOARD_IMAGES.volunteersBanner,
      alt: "Volunteers needed at Mekor newsletter banner",
      aspect: "banner",
    },
    paragraphs: [
      "Help with Kiddush setup, hospitality, cholent (Erik Schneiman can teach the Mekor recipe), mashgiach work for IKC establishments, or eruv checking. Training is provided.",
    ],
    links: [
      { label: "Volunteer hub", href: "/team-4" },
      { label: "Email about volunteering", href: "mailto:mekorhabracha@gmail.com?subject=Volunteer" },
      { label: "Erik Schneiman (cholent)", href: "mailto:erik.schneiman@gmail.com" },
    ],
  },
  {
    title: "Yizkor Books 2026–2027",
    eyebrow: "Remembrance",
    icon: "yizkor",
    paragraphs: [
      "Mekor publishes a Yizkor Book for Yom Kippur, Shemini Atzeret, Pesach, and Shavuot. Submission deadline: September 1, 2026 at 12:00 PM. Contributions by check payable to the shul are welcome.",
    ],
    links: [
      {
        label: "Email Yizkor submissions",
        href: "mailto:mekorhabracha@gmail.com?subject=Yizkor%20Book%202026-2027",
      },
    ],
  },
];

export const FEATURED_NOW: BulletinCard[] = [
  {
    title: "Strengthen the Center City Eruv",
    eyebrow: "Campaign",
    icon: "eruv",
    tone: "featured",
    image: {
      src: BOARD_IMAGES.jerusalem,
      alt: "Jerusalem and the Western Wall at dusk",
      aspect: "wide",
    },
    paragraphs: [
      "Help ensure this vital community resource remains reliable and halachically sound. Goal: $75,000. Donate through the Mekor Habracha campaign team, or read about the full campaign.",
    ],
    links: [
      { label: "Donate via Mekor team", href: ERUV_CAMPAIGN_TEAM },
      { label: "Full campaign details", href: ERUV_CAMPAIGN_INFO },
      { label: "Monthly Eruv support", href: ERUV_DONATION_LINK },
    ],
  },
  {
    title: "Religious Zionism Class with Rabbi Gotlib",
    eyebrow: "New class",
    icon: "class",
    tone: "featured",
    image: {
      src: BOARD_IMAGES.zionismFlyer,
      alt: "Flyer for The Sacred and the State class with Rabbi Gotlib",
      aspect: "flyer",
    },
    paragraphs: [
      "Join Rabbi Gotlib Tuesdays at 7:00pm beginning July 14 for a study of Rav Rabinovitch's Pathways to God: Torah, Society, and State. Sponsorships welcome; sponsors of $180+ receive a complimentary copy of the book.",
    ],
    links: [
      { label: "RSVP for the class", href: ZIONISM_CLASS_RSVP },
      {
        label: "Read the announcement",
        href: "/newsletters/new-class-on-zionism-and-democracy-2026-07-05",
      },
    ],
  },
];

export const COMMUNITY_UPDATES: BulletinCard[] = [
  {
    title: "Become an Eruv Checker",
    eyebrow: "Volunteer",
    icon: "eruv",
    tone: "urgent",
    paragraphs: [
      "Several of our eruv checkers have left the area, and we need new volunteers. If you have a bicycle or car, and you could help out once every 6 weeks, or even less often, please sign up! Training will be provided; please email Harry Schley at harry@schley.com.",
    ],
    links: [
      { label: "Harry Schley", href: "mailto:harry@schley.com" },
      { label: "Volunteer at Mekor", href: "/team-4" },
    ],
  },
  {
    title: "Seeking Volunteer Mashgiachs",
    eyebrow: "Kosher",
    icon: "volunteer",
    tone: "urgent",
    paragraphs: [
      "It is exciting that our list of Center City kosher restaurants is expanding once again, but we rely on volunteers to help in this process! No experience is necessary; Rabbi Hirsch will provide training. For more info, please email the shul.",
    ],
    links: [
      { label: "Email the Shul", href: "mailto:mekorhabracha@gmail.com?subject=Mashgiach%20Volunteers" },
      { label: "Kosher Guide", href: "/kosher-map" },
    ],
  },
  {
    title: "Center City Mikvah is Open!",
    eyebrow: "Milestone",
    icon: "mikvah",
    paragraphs: [
      "We're excited to announce that the Mei Shalva Center City Community Mikvah, located at 509 Pine Street, is now open! The women's mikvah, men's mikvah, and keilim mikvah are all operational.",
      "We are currently seeking volunteers to help staff the keilim mikvah. For the schedule or to make an appointment, please visit https://philamikvah.org or call/text 267-225-2651. Mazal Tov to the entire Center City Jewish community on this meaningful milestone!",
    ],
    links: [
      { label: "Mikvah Schedule", href: "https://philamikvah.org/" },
      { label: "Call/Text 267-225-2651", href: "tel:+12672252651" },
    ],
  },
  {
    title: "Notary Service to Benefit Mekor",
    eyebrow: "Member offer",
    icon: "notary",
    paragraphs: [
      "Need something notarized in Philadelphia after work hours? Mekor member Chesky Kopel is a licensed Pennsylvania notary public and will provide notarial services in exchange for a small donation to the shul. For more information, contact Chesky at ckopel@gmail.com.",
    ],
    links: [{ label: "Contact Chesky", href: "mailto:ckopel@gmail.com" }],
  },
  {
    title: "The Center City Eruv needs your financial support!",
    eyebrow: "Ongoing",
    icon: "eruv",
    tone: "urgent",
    paragraphs: [
      "The Eruv plays a vital role in our vibrant Center City Jewish Community life, but is often taken for granted. We need ongoing financial support to pay the specialist rabbi who travels in from NJ to perform repairs, and to buy supplies for repair jobs and liability insurance, all of which totals over $10,000 per year.",
      "We rely entirely on donations for these expenses, and we need a financial cushion to ensure that emergency repairs can be made in time for Shabbat the next time they are necessary. If you & your family benefit from our Eruv, we respectfully ask that you make a recurring monthly donation of at least $18. Thank you for your continued support of the Center City Eruv!",
    ],
    links: [
      { label: "Donate to the Eruv", href: ERUV_DONATION_LINK },
      { label: "General Donations", href: "/donations" },
    ],
  },
  {
    title: "Orthodox Union Tehillim",
    eyebrow: "Daily",
    icon: "community",
    paragraphs: [
      "Daily at 1:00 PM; to participate, dial (773) 377-9170.",
      "Please join the Orthodox Union community for the recitation of Tehillim (chapters 20, 27 and 130) and divrei chizuk (words of inspiration) from our rabbanim each afternoon at 1:00 PM EDT.",
    ],
    links: [{ label: "Dial (773) 377-9170", href: "tel:+17733779170" }],
  },
  {
    title: "Weekly Online Parsha Shiur",
    eyebrow: "Learning",
    icon: "class",
    paragraphs: [
      "Live on Thursdays at 1:00 PM EST; available online on demand.",
      "Mekor member Dr. Saundra Sterling Epstein (Sunnie) gives a weekly Parsha shiur on Melrose B'nai Israel Emanu El's (MBIEE) Facebook page. To access, visit https://www.facebook.com/groups/mbiee.org. If required, you will be invited in by the administrator.",
    ],
    links: [{ label: "Watch on Facebook", href: "https://www.facebook.com/groups/mbiee.org" }],
  },
];

export const COMMUNITY_ANNOUNCEMENTS: BulletinCard[] = [
  {
    title: "East of Broad Home for Sale",
    eyebrow: "Housing",
    icon: "community",
    paragraphs: [
      "We are selling our East of Broad ~2,000 square foot home in the spring (3 bedrooms, 2 baths, on a beautiful, quiet side street right off of Bainbridge; finished basement not included in square footage).",
      "The home is bright and combines turn-of-the-century interior architectural details (e.g., high ceilings and original random width floors) with modern, urban living features (e.g., exposed brick and top-of-line kitchen appliances). We will still be your neighbor, as we are only moving a block away. Please email yoella.epstein@gmail.com if you are interested in finding out more.",
    ],
    links: [{ label: "Inquire by Email", href: "mailto:yoella.epstein@gmail.com" }],
  },
  {
    title: "Need a contractor? Special Offer for Mekor Community",
    eyebrow: "Local offer",
    icon: "community",
    paragraphs: [
      "Akiladelphia Creative Contracting will donate 5% of the cost of your job to Mekor. Senior discount also.",
      "For more info, contact (215) 589-5405 or akiladelphia@gmail.com.",
    ],
    links: [
      { label: "Akiladelphia website", href: "https://akiladelphia.com/" },
      { label: "Call (215) 589-5405", href: "tel:+12155895405" },
      { label: "Email", href: "mailto:akiladelphia@gmail.com" },
    ],
  },
  {
    title: "Health & Wellness Offer for Mekor Community",
    eyebrow: "Member offer",
    icon: "health",
    paragraphs: [
      "Mekor member David Parvey has launched a health and wellness company utilizing unique CBD formulas to assist in balancing out your day. He is offering a 20% discount to Mekor members using discount code \"MEKORMEMBER\" and all proceeds will be split with the shul.",
      "All products are vegan, third-party tested and can be found at www.wefreeco.com.",
    ],
    links: [{ label: "Visit wefreeco.com", href: "http://www.wefreeco.com/" }],
  },
  {
    title: "Free Career Guidance at JEVS",
    eyebrow: "Careers",
    icon: "career",
    paragraphs: [
      "JEVS provides assistance (resumes, practice mock interviews, etc.) to those who are seeking a job or looking to change jobs. For congregants referred by Rabbi Hirsch, there will be no charge for the first visit. Other visits are on a sliding fee scale or free depending on income.",
      "To schedule your first visit free of charge, please email the shul, and Rabbi Hirsch will make the referral. Then call Wendy Rosenfeldt at 215-832-0878 to schedule your appointment. For information about free job-search webinars, visit https://www.jevshumanservices.org/careerstrategies/.",
    ],
    links: [
      {
        label: "Request Rabbi Referral",
        href: "mailto:mekorhabracha@gmail.com?subject=JEVS%20Referral&body=Please%20refer%20me%20to%20JEVS%20for%20my%20free%20career%20strategies%20consultation.",
      },
      { label: "Call Wendy Rosenfeldt", href: "tel:+12158320878" },
      { label: "JEVS Career Strategies", href: "https://www.jevshumanservices.org/careerstrategies/" },
    ],
  },
  {
    title: "Kiyum Initiative",
    eyebrow: "Israel",
    icon: "israel",
    paragraphs: [
      "The Kiyum Initiative has tailored a program along with leading institutions in Jerusalem to enable the entry of Haredi individuals into the labor pool through a combination of living stipends, enhanced education, and job placement.",
      "We are raising funds and building awareness for the upcoming academic year to consist of 55 students, and so we are seeking donations to Sponsor-A-Scholar.",
    ],
    links: [{ label: "Kiyum Initiative website", href: "http://www.kiyuminitiative.org/" }],
  },
  {
    title: "Jewish Matchmaking -- Shiduch.org",
    eyebrow: "Singles",
    icon: "matchmaking",
    paragraphs: [
      "We are a Jewish matchmaking site for marriage-minded singles worldwide. Singles can create a FREE profile on the site, and our matchmakers will search through our database for compatible matches. If you'd like more info, please visit shiduch.org or contact Rachel at member@shiduch.org.",
    ],
    links: [
      { label: "Visit shiduch.org", href: "https://shiduch.org" },
      { label: "Contact Rachel", href: "mailto:member@shiduch.org" },
    ],
  },
];
