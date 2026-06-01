// Newsletter archive data.
//
// Each newsletter mirrors a sent Mailchimp issue. Text and images are kept
// VERBATIM from the original email; only the presentation is redesigned (see
// components/newsletters/newsletter-article.tsx). Where the original linked to
// an external mekorhabracha.org page, we point at the equivalent internal route
// so links work on this site.

export type NewsletterInline = string | { text: string; href: string };
export type NewsletterRich = NewsletterInline[];

export type NewsletterBlock =
  | { kind: "image"; src: string; alt: string }
  | { kind: "section"; title: string }
  | { kind: "paragraph"; text: NewsletterRich; align?: "center"; italic?: boolean; strong?: boolean; small?: boolean }
  | { kind: "schedule"; heading?: string; rows: { time: string; label: NewsletterRich }[] }
  | { kind: "list"; items: NewsletterRich[] }
  | { kind: "button"; label: string; href: string }
  | { kind: "links"; items: { label: string; href: string }[] };

export type Newsletter = {
  slug: string;
  parsha: string;
  dateRange: string;
  hebrewDate: string;
  sentOn: string; // ISO date, used for ordering
  preview: string;
  headerImage?: string;
  leadImage?: string;
  blocks: NewsletterBlock[];
};


const PAYPAL_ERUV = "https://www.paypal.com/donate/?hosted_button_id=MP2WKX3QTP34Y";
const MISHEBEIRACH = "https://docs.google.com/spreadsheets/d/1F1CPVtVqCmaK54YPU-R6d-6DMLqgVz-SsSdmFhrkBU8/edit#gid=0";
const HEBREW_HELP_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSdArQHweRvCWMRwg_4af7CqW6sn_7Kk5LV93Cp2D74PQOUzoA/viewform";
const WINE_LINK = "https://ccshul.us2.list-manage.com/track/click?u=f9fe87a16c42c24704c099073&id=c0221dbdb3&e=2ecd94f861";
const JUDAICA_LINK = "https://ccshul.us2.list-manage.com/track/click?u=f9fe87a16c42c24704c099073&id=f024e23d5b&e=2ecd94f861";
const IDF_PRAYER = "https://docs.google.com/document/d/1TY-ildXp7DkgEC9NbNhyxdoveTa38GZEEj4P55dim7c/edit?usp=sharing";
const HIRSCH_SUBSTACK = "https://rabbieliezerhirsch.substack.com/";
const GOTLIB_SUBSTACK = "https://substack.com/@rabbistevengotlib";
const EPSTEIN_YOUTUBE = "https://www.youtube.com/@saundraepstein4748";
const SUBSCRIBE_URL = "http://eepurl.com/dJ8irg";
const SHUL_EMAIL = "mailto:mekorhabracha@gmail.com";

export const NEWSLETTERS: Newsletter[] = [
  {
    slug: "nasso-5786",
    parsha: "Parshat Nasso",
    dateRange: "May 29–30, 2026",
    hebrewDate: "14 Sivan 5786",
    sentOn: "2026-05-29",
    preview: "Shabbat Shalom from Mekor!",
    headerImage: `https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/5c6437f54136e637df2fb975b286004049968365-75d082cb-45f0-420c-95dd-3f153937e7ef.png`,
    leadImage: `https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/70768773e8133b0e7254a2ea6154d7c9212c235d-210e849f-0dff-f50d-8135-5cfaa09eb671.png`,
    blocks: [
      {
        kind: "schedule",
        heading: "Friday, May 29",
        rows: [
          { time: "7:00pm", label: ["Mincha / Kabbalat Shabbat / Maariv"] },
          { time: "8:03pm", label: ["Candle Lighting"] },
        ],
      },
      {
        kind: "schedule",
        heading: "Shabbat, May 30",
        rows: [
          { time: "9:15am", label: ["Morning Services"] },
          { time: "10:00am", label: ["Torah Reading"] },
          { time: "~11:30am", label: ["Kiddush"] },
          { time: "7:00pm", label: ["Pre-Mincha Classes"] },
          { time: "8:00pm", label: ["Mincha / Third Meal / Maariv"] },
          { time: "9:11pm", label: ["Havdala"] },
        ],
      },
      { kind: "paragraph", italic: true, text: ["Thank you to our readers, David Daman, Yitzchak Tollinsky, and Yogi Sragow"] },
      { kind: "paragraph", italic: true, text: ["Mini minyan is taking a break for the summer, but will be back in the fall!"] },
      { kind: "paragraph", align: "center", italic: true, text: ["The Center City Eruv is UP!"] },
      {
        kind: "paragraph",
        align: "center",
        italic: true,
        text: [
          { text: "Please help the Center City Eruv with a donation.", href: PAYPAL_ERUV },
          " And, if you're able, the best way to support the Eruv is to become an eruv-checker. Speak to Rabbi Hirsch or Rabbi Gotlib if you are interested in this opportunity!",
        ],
      },
      {
        kind: "paragraph",
        align: "center",
        text: [
          "For more details on all Shabbat Zmanim, weekly services, sponsorship opportunities, ",
          { text: "Mishebeirach requests", href: MISHEBEIRACH },
          ", and programming, please visit ",
          { text: "mekorhabracha.org", href: "http://mekorhabracha.org" },
          ".",
        ],
      },

      { kind: "section", title: "Kiddush This Week" },
      { kind: "paragraph", align: "center", text: ["This week's Kiddush is sponsored by"] },
      { kind: "paragraph", align: "center", strong: true, text: ["Tzuriel and Katie Sapir"] },
      { kind: "paragraph", align: "center", text: ["in thanks to the Mekor community for four wonderful years."] },
      { kind: "paragraph", align: "center", text: ["Thank you! We will miss you dearly."] },
      {
        kind: "paragraph",
        align: "center",
        italic: true,
        text: [
          "We greatly appreciate all of the contributions and gestures, great and small, that make Mekor the inclusive and welcoming community that we are.",
        ],
      },
      {
        kind: "paragraph",
        align: "center",
        italic: true,
        text: [
          "We are especially thankful to those who sponsor, set up, and clean up our Shabbat dinners, kiddush, and third meal. Thank you for all of your help!",
        ],
      },

      { kind: "section", title: "Mekor Membership" },
      { kind: "button", label: "Join Mekor or Renew Your Membership HERE", href: "/membership" },

      { kind: "section", title: "Hebrew Help at Mekor" },
      {
        kind: "paragraph",
        text: [
          "Parents can now sign-up their children (up to age 18) to learn Hebrew, Torah Reading, and/or Tefillah skills with members of the Mekor community.",
        ],
      },
      {
        kind: "paragraph",
        text: [
          "Our team will match each child with a tutor who will begin learning with them at a mutually convenient time at the end of the summer/beginning of the upcoming school year. ",
          { text: "Sign-up HERE!", href: HEBREW_HELP_FORM },
        ],
      },

      { kind: "image", src: `https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/35957d0bb6048365d1f9e163034e00b2f438fe16-feedebb2-cfa6-f802-6380-992bde98b0cc.png`, alt: "Mekor Habracha program flyer" },
      { kind: "image", src: `https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/1f268fc5730a0ed20ab7c2bda8e8cc875b178176-da3d6288-0506-acfd-a3dc-c5d2d105ecb5.png`, alt: "Mekor Habracha program flyer" },
      { kind: "image", src: `https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/f7d19747aa1c550908be001049dff936628b12c5-2806324c-f8e6-da84-00e4-cab36dc0c8ff.png`, alt: "Mekor Habracha program flyer" },

      {
        kind: "paragraph",
        align: "center",
        strong: true,
        text: ["For KosherWINE use ", { text: "this link", href: WINE_LINK }, "."],
      },
      {
        kind: "paragraph",
        align: "center",
        strong: true,
        text: ["For Judaica use ", { text: "this link", href: JUDAICA_LINK }, "."],
      },

      { kind: "section", title: "Donations to Mekor" },
      {
        kind: "paragraph",
        align: "center",
        text: [
          "We deeply appreciate donations -- large and small -- to help support our shul. To make your contribution, please use ",
          { text: "this link", href: "/donations" },
          ".",
        ],
      },

      { kind: "section", title: "Support of Israel: Events & Initiatives" },
      { kind: "image", src: `https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/6db8fde523042cea6b76be2db7a756b19fccc0ce-bfb69b9c-c1c0-4a73-bf44-92ffd837623e.jpg`, alt: "Support of Israel" },
      {
        kind: "paragraph",
        text: [
          "In addition to the information below, please visit our new ",
          { text: "Support of Israel website page", href: "/israel" },
          " for announcements about initiatives online and across the greater Philadelphia Jewish community, all in support of Israel. See our newest entries about how you can support civil defense efforts in Israel.",
        ],
      },
      {
        kind: "paragraph",
        text: [
          "To view the latest prayer for the welfare of soldiers of the IDF and all victims of terror ",
          { text: "click here.", href: IDF_PRAYER },
        ],
      },

      { kind: "image", src: `https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/19688a57184fe02f7f7ad80af2e7241c7a46af54-e94d630a-6bee-7a85-d436-04095d15cddd.jpg`, alt: "From the Rabbis" },
      {
        kind: "paragraph",
        strong: true,
        text: [
          "Click ",
          { text: "here", href: HIRSCH_SUBSTACK },
          " to read Rabbi Hirsch's latest Torah articles on Substack, many of which speak about Israel.",
        ],
      },
      {
        kind: "paragraph",
        strong: true,
        text: ["Click ", { text: "here", href: GOTLIB_SUBSTACK }, " to read Rabbi Gotlib's latest articles on Substack."],
      },
      {
        kind: "paragraph",
        strong: true,
        text: [
          "Sunnie Epstein's weekly Divrei Torah on the Parshiot HaShavuah can be found on YouTube ",
          { text: "here", href: EPSTEIN_YOUTUBE },
          ".",
        ],
      },

      { kind: "image", src: `https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/1a60eb4d675eb724220a7b2f58bd0e9afea19ded-b5a03dc5-f2eb-209c-827e-02771fe762b5.png`, alt: "Daily Minyan" },
      { kind: "section", title: "Daily Minyan" },
      { kind: "paragraph", text: ["We welcome everyone to join us for a Minyan, whether it's once a week or every weekday!"] },
      {
        kind: "paragraph",
        text: [
          "Please ",
          { text: "email the Shul", href: `${SHUL_EMAIL}?subject=Interested%20in%20joining%20the%20Minyan%20Signal%20Group` },
          " to RSVP for a particular service or to be added to the Signal Minyan group. RSVPs for minyanim are appreciated.",
        ],
      },
      {
        kind: "paragraph",
        strong: true,
        text: ["Morning and Evening weekday services are followed by a brief halacha insight by Rabbi Hirsch or Rabbi Gotlib."],
      },

      { kind: "section", title: "Weekday Services & Events: May 31 – June 5" },
      {
        kind: "schedule",
        heading: "Sunday, May 31",
        rows: [
          { time: "8:30am", label: ["Morning Services followed by Amud Yomi"] },
          { time: "7:50pm", label: ["Mincha/Maariv*"] },
        ],
      },
      {
        kind: "schedule",
        heading: "Monday, June 1",
        rows: [
          { time: "6:45am", label: ["Morning Services"] },
          { time: "7:30am", label: ["Amud Yomi"] },
          { time: "2:00pm", label: ["Mincha at 1818 Market or Mikveh Israel"] },
          { time: "7:50pm", label: ["Mincha/Maariv*"] },
        ],
      },
      {
        kind: "schedule",
        heading: "Tuesday, June 2",
        rows: [
          { time: "6:55am", label: ["Morning Services"] },
          { time: "7:30am", label: ["Amud Yomi"] },
          { time: "2:00pm", label: ["Mincha at 1818 Market or Mikveh Israel"] },
          { time: "7:50pm", label: ["Mincha/Maariv*"] },
        ],
      },
      {
        kind: "schedule",
        heading: "Wednesday, June 3",
        rows: [
          { time: "6:55am", label: ["Morning Services"] },
          { time: "7:30am", label: ["Amud Yomi"] },
          { time: "2:00pm", label: ["Mincha at 1818 Market or Mikveh Israel"] },
          { time: "7:50pm", label: ["Mincha/Maariv*"] },
        ],
      },
      {
        kind: "schedule",
        heading: "Thursday, June 4",
        rows: [
          { time: "6:45am", label: ["Morning Services"] },
          { time: "7:30am", label: ["Amud Yomi"] },
          { time: "2:00pm", label: ["Mincha at 1818 Market or Mikveh Israel"] },
          { time: "7:50pm", label: ["Mincha/Maariv*"] },
        ],
      },
      {
        kind: "schedule",
        heading: "Friday, June 5",
        rows: [
          { time: "6:55am", label: ["Morning Services"] },
          { time: "7:30am", label: ["Amud Yomi"] },
          { time: "7:00pm", label: ["Mincha/Kabbalat Shabbat/Maariv"] },
          { time: "8:08pm", label: ["Candle Lighting"] },
        ],
      },
      {
        kind: "paragraph",
        italic: true,
        small: true,
        text: [
          "*At this time, Weekday Mincha/Ma'ariv will only be held if at least 10 people sign up in advance. Please email the shul to RSVP for a particular service or to be added to our Minyan WhatsApp Group.",
        ],
      },
      {
        kind: "paragraph",
        italic: true,
        small: true,
        text: ["** Please note that Friday Night Services will remain at 7:00pm through the Summer."],
      },

      { kind: "image", src: `https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/fd90a6f016cddd5f3947f9637be544246ffcc2c7-239cd781-49f2-2aa8-92d7-7eb7a6d7091e.png`, alt: "Volunteer at Mekor" },
      {
        kind: "paragraph",
        strong: true,
        text: ["We all benefit from the wonderful work done by Mekor volunteers! Please consider helping out with the following initiatives:"],
      },
      {
        kind: "list",
        items: [
          ["Join the Kiddush (setup) Committee"],
          ["Join the Hospitality Committee"],
          [
            "Make cholent for Kiddush. Erik will teach you how to make the special Mekor Habracha recipe! Please contact Erik Schneiman @ ",
            { text: "erik.schneiman@gmail.com", href: "mailto:erik.schneiman@gmail.com" },
          ],
          ["Be a Mashgiach for IKC establishments"],
          ["Be an Eruv Checker"],
        ],
      },
      { kind: "paragraph", strong: true, text: ["Training will be provided for all positions."] },
      {
        kind: "paragraph",
        strong: true,
        text: ["Please ", { text: "email the Shul", href: `${SHUL_EMAIL}?subject=I'd%20like%20to%20help` }, " for info about volunteering!"],
      },

      { kind: "button", label: "Participate in our Shul Community — View our Bulletin Board", href: "/mekor-bulletin-board" },
      { kind: "button", label: "Like what you see? Subscribe to our weekly newsletter!", href: SUBSCRIBE_URL },
    ],
  },
];

export function getNewslettersByDate(): Newsletter[] {
  return [...NEWSLETTERS].sort((a, b) => b.sentOn.localeCompare(a.sentOn));
}

export function getLatestNewsletter(): Newsletter | null {
  return getNewslettersByDate()[0] ?? null;
}

export function getNewsletterBySlug(slug: string): Newsletter | null {
  return NEWSLETTERS.find((item) => item.slug === slug) ?? null;
}
