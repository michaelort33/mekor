export const MEDIUM_STATIC_PATHS = [
  "/donations",
  "/visit-us",
  "/contact-us",
  "/our-communities",
  "/davening",
  "/mekor-bulletin-board",
  "/center-city-beit-midrash",
  "/copy-of-center-city-beit-midrash",
  "/philly-jewish-community",
  "/testimonials",
  "/general-5",
  "/old-kosher-restaurants",
] as const;

export type MediumStaticPath = (typeof MEDIUM_STATIC_PATHS)[number];

export type MediumPageLink = {
  label: string;
  href: string;
  external?: boolean;
};

type MediumPageSectionCard = {
  title: string;
  body: string;
  links?: MediumPageLink[];
};

type MediumPageSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: MediumPageLink[];
  cards?: MediumPageSectionCard[];
};

type MediumInfoPageConfig = {
  archetype: "info";
  path: MediumStaticPath;
  title: string;
  eyebrow?: string;
  intro: string[];
  primaryLinks?: MediumPageLink[];
  secondaryLinks?: MediumPageLink[];
  sections: MediumPageSection[];
};

type MediumContactMethod = {
  label: string;
  value: string;
  href?: string;
};

type MediumContactPageConfig = {
  archetype: "contact";
  path: MediumStaticPath;
  title: string;
  eyebrow?: string;
  intro: string[];
  methods: MediumContactMethod[];
  addressLines: string[];
  formHeading: string;
  formDescription: string;
  sourcePath: MediumStaticPath;
  primaryLinks?: MediumPageLink[];
  secondaryLinks?: MediumPageLink[];
};

type MediumDirectoryEntry = {
  title: string;
  body?: string;
  quoteBy?: string;
  details?: string[];
  links?: MediumPageLink[];
};

type MediumDirectoryGroup = {
  heading: string;
  entries: MediumDirectoryEntry[];
};

type MediumDirectoryPageConfig = {
  archetype: "directory";
  path: MediumStaticPath;
  title: string;
  eyebrow?: string;
  intro: string[];
  primaryLinks?: MediumPageLink[];
  secondaryLinks?: MediumPageLink[];
  groups: MediumDirectoryGroup[];
};

export type MediumStaticPageConfig =
  | MediumInfoPageConfig
  | MediumContactPageConfig
  | MediumDirectoryPageConfig;

export const MEDIUM_STATIC_PAGE_CONFIGS: Record<MediumStaticPath, MediumStaticPageConfig> = {
  "/donations": {
    archetype: "info",
    path: "/donations",
    eyebrow: "Support Mekor",
    title: "How You Can Donate and Help Mekor",
    intro: [
      "The generosity of members and visitors helps Mekor serve our congregation and the wider Jewish community.",
      "Donations are a meaningful way to celebrate milestones, honor loved ones, and sustain communal life in Center City.",
    ],
    primaryLinks: [
      {
        label: "Donate by Credit / ACH / Apple Pay",
        href: "https://donate.stripe.com/3cI6oz9ef0tU8qXdB35Ne00",
        external: true,
      },
      {
        label: "Donate with Venmo",
        href: "https://www.venmo.com/u/Mekor-Habracha",
        external: true,
      },
      {
        label: "Donate with PayPal Giving Fund",
        href: "https://www.paypal.com/donate/?hosted_button_id=KUJ7EXBZP4MHC",
        external: true,
      },
    ],
    secondaryLinks: [
      { label: "Zelle: mekorhabracha@gmail.com", href: "mailto:mekorhabracha@gmail.com" },
      {
        label: "PayPal Checkout",
        href: "https://www.paypal.com/ncp/payment/C5ZNZELMHX2A4",
        external: true,
      },
      { label: "Kiddush Donation Page", href: "/kiddush" },
    ],
    sections: [
      {
        heading: "Ways to donate",
        cards: [
          {
            title: "Online payments",
            body: "Use Venmo, PayPal Giving Fund, PayPal checkout, Zelle, or Stripe (Credit / ACH / Apple Pay).",
          },
          {
            title: "By check",
            body: "Please make checks payable to Mekor Habracha. Mail to Ellen Geller, 3 Saint James Ct., Philadelphia, PA 19106.",
          },
          {
            title: "Dedications and sponsorships",
            body: "Celebrate simchas and honor loved ones through Kiddush sponsorships and other dedication opportunities.",
            links: [{ label: "Sponsor Kiddush", href: "/kiddush" }],
          },
        ],
      },
      {
        heading: "Donation opportunities",
        bullets: [
          "Kiddush and Third Meal sponsorship (member and non-member options)",
          "Memorial board plaques in the sanctuary",
          "Dedicated siddurim, machzorim, and chumashim",
          "Community dinner sponsorship",
          "Talitot and sanctuary dedication projects",
          "General contributions of any amount",
        ],
        paragraphs: [
          "All contributions are tax-deductible and acknowledged by letter.",
          "For dedication details or custom giving options, email the shul office.",
        ],
        links: [{ label: "Email the Shul", href: "mailto:mekorhabracha@gmail.com" }],
      },
    ],
  },
  "/visit-us": {
    archetype: "contact",
    path: "/visit-us",
    eyebrow: "Center City Synagogue",
    title: "Visit Us",
    intro: [
      "We are located in Center City Philadelphia and welcome visitors for services, classes, and community programming.",
      "If this is your first visit, send us a quick message so we can help you get oriented.",
    ],
    methods: [
      { label: "Phone", value: "(215) 525-4246", href: "tel:+12155254246" },
      { label: "Email", value: "admin@mekorhabracha.org", href: "mailto:admin@mekorhabracha.org" },
    ],
    addressLines: [
      "Mekor Habracha Center City Synagogue",
      "1500 Walnut St, Suite 206",
      "Philadelphia, PA 19102",
    ],
    formHeading: "Send us a message",
    formDescription:
      "Use this form for questions about davening, membership, events, or your first visit to Mekor.",
    sourcePath: "/visit-us",
    primaryLinks: [
      {
        label: "Join WhatsApp Community",
        href: "https://chat.whatsapp.com/G7JTiUN3aPN1V09lbBLC7G",
        external: true,
      },
      {
        label: "Open in Google Maps",
        href: "https://maps.google.com/?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102",
        external: true,
      },
    ],
    secondaryLinks: [
      {
        label: "Latest Newsletters",
        href: "https://us2.campaign-archive.com/home/?u=f9fe87a16c42c24704c099073&id=94f3350887",
        external: true,
      },
    ],
  },
  "/contact-us": {
    archetype: "contact",
    path: "/contact-us",
    eyebrow: "Get in Touch",
    title: "Contact Us",
    intro: [
      "We would love to hear from you.",
      "Send a message for membership questions, scheduling details, or general community inquiries.",
    ],
    methods: [
      { label: "Phone", value: "(215) 525-4246", href: "tel:+12155254246" },
      {
        label: "General Email",
        value: "mekorhabracha@gmail.com",
        href: "mailto:mekorhabracha@gmail.com",
      },
      {
        label: "Admin Email",
        value: "admin@mekorhabracha.org",
        href: "mailto:admin@mekorhabracha.org",
      },
    ],
    addressLines: [
      "Mekor Habracha Center City Synagogue",
      "1500 Walnut St, Suite 206",
      "Philadelphia, PA 19102",
    ],
    formHeading: "Contact form",
    formDescription: "Tell us how we can help and someone from the team will follow up.",
    sourcePath: "/contact-us",
    primaryLinks: [
      {
        label: "Mekor Community WhatsApp",
        href: "https://chat.whatsapp.com/INZrPssTZeHK5xrx5ghECF",
        external: true,
      },
      {
        label: "Open in Google Maps",
        href: "https://maps.google.com/?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102",
        external: true,
      },
    ],
    secondaryLinks: [
      {
        label: "Latest Newsletters",
        href: "https://us2.campaign-archive.com/home/?u=f9fe87a16c42c24704c099073&id=94f3350887",
        external: true,
      },
    ],
  },
  "/our-communities": {
    archetype: "info",
    path: "/our-communities",
    eyebrow: "Our Community",
    title: "Mekor Habracha Community",
    intro: [
      "Mekor Habracha is a vibrant and inclusive Orthodox community in Center City Philadelphia.",
      "Our membership includes students, professionals, families, and long-time community builders from across the city.",
    ],
    primaryLinks: [
      { label: "Contact Us", href: "/contact-us" },
      { label: "Join Us", href: "mailto:admin@mekorhabracha.org?subject=Join%20Us" },
    ],
    sections: [
      {
        heading: "Our history",
        paragraphs: [
          "Mekor Habracha emerged from an independent chavura in the Rittenhouse area during the 1990s.",
          "The group met under Etz Chaim from 1999 to 2001, then continued as a lay-led community until Rabbi Eliezer Hirsch began leading the congregation in 2006.",
          "Since then, Mekor grew into an independent synagogue and a central contributor to Jewish life in Center City.",
        ],
        links: [
          { label: "Aish Chaim", href: "https://aishchaim.com/", external: true },
          {
            label: "Read about Mekor's origins",
            href: "https://mekorhabracha.github.io/2013/10/16/modern-orthodox-community.html",
            external: true,
          },
          {
            label: "Jewish Exponent feature",
            href: "https://www.jewishexponent.com/mekor-habracha-continues-to-bring-orthodox-vibrancy-to-center-city/",
            external: true,
          },
        ],
      },
      {
        heading: "Our mission",
        paragraphs: [
          "We serve the spiritual, social, and educational needs of Center City's diverse Jewish community.",
          "We strive to create an environment where people of all ages and backgrounds feel welcome in Orthodox services and communal life.",
        ],
      },
      {
        heading: "Who we are",
        paragraphs: [
          "Visitors are always welcome, whether local residents or out-of-towners.",
          "Mekor offers religious, educational, and social programming, with many ways to volunteer and take leadership roles.",
        ],
        links: [{ label: "Mekor Couples", href: "/mekorcouples" }],
      },
    ],
  },
  "/davening": {
    archetype: "info",
    path: "/davening",
    eyebrow: "Services",
    title: "Davening",
    intro: [
      "Service times may vary seasonally. RSVP is appreciated for weekday and Friday evening minyanim.",
      "For confirmations and updates, email the shul office or join the minyan WhatsApp group.",
    ],
    primaryLinks: [
      { label: "Email: admin@mekorhabracha.org", href: "mailto:admin@mekorhabracha.org" },
      {
        label: "Join Minyan WhatsApp",
        href: "https://chat.whatsapp.com/INZrPssTZeHK5xrx5ghECF",
        external: true,
      },
    ],
    sections: [
      {
        heading: "Shabbat services",
        cards: [
          {
            title: "Friday evening",
            body: "Mincha / Kabbalat Shabbat / Ma'ariv: generally 7:00 PM in summer and around candle-lighting time in winter.",
          },
          {
            title: "Shabbat morning",
            body: "Shacharit at 9:15 AM, followed by Kiddush around 11:30 AM.",
          },
          {
            title: "Shabbat afternoon",
            body: "Shabbat class (summer), Mincha approximately 30 minutes before sundown, followed by third meal.",
          },
        ],
      },
      {
        heading: "Weekday services",
        bullets: [
          "Sunday Shacharit: 8:30 AM",
          "Monday/Thursday/Rosh Chodesh/Fast days: 6:45 AM",
          "Tuesday/Wednesday/Friday: 6:55 AM",
          "Major secular holidays: 8:30 AM",
          "Winter Maariv: 6:30 PM",
          "Summer Mincha followed by Maariv: approximately 15 minutes before sunset",
        ],
        paragraphs: [
          "Weekday morning and evening services are often followed by a brief halachic insight. Amud Yomi typically follows morning services.",
        ],
      },
      {
        heading: "Nearby weekday minyanim",
        links: [
          {
            label: "Orthodox Community at Penn",
            href: "https://pennhillel.org/program/orthodox-community-at-penn/",
            external: true,
          },
          { label: "Mikveh Israel Synagogue", href: "https://www.mikvehisrael.org/", external: true },
          { label: "Bnai Abraham Chabad", href: "https://www.phillyshul.com/", external: true },
          { label: "Lower Merion Synagogue", href: "https://www.lowermerionsynagogue.org/", external: true },
          { label: "Young Israel of the Main Line", href: "https://www.yiml.org/", external: true },
        ],
      },
    ],
  },
  "/mekor-bulletin-board": {
    archetype: "directory",
    path: "/mekor-bulletin-board",
    eyebrow: "Community Resources",
    title: "Mekor Bulletin Board",
    intro: [
      "A running board of volunteer needs, communal announcements, and member opportunities.",
      "To post an item for community circulation, contact the shul office.",
    ],
    primaryLinks: [{ label: "Email the Shul", href: "mailto:mekorhabracha@gmail.com" }],
    groups: [
      {
        heading: "Current highlights",
        entries: [
          {
            title: "Become an Eruv checker",
            body: "Volunteers with bikes or cars are needed to help inspect the eruv on rotation.",
            links: [{ label: "harry@schley.com", href: "mailto:harry@schley.com" }],
          },
          {
            title: "Volunteer mashgiachs",
            body: "As kosher dining options expand, volunteers are needed. Training is provided.",
            links: [{ label: "Contact Mekor", href: "mailto:mekorhabracha@gmail.com?subject=Mashgiach%20Volunteers" }],
          },
          {
            title: "Center City Mikvah",
            body: "Mei Shalva Mikvah at 509 Pine Street is operational for women, men, and keilim.",
            links: [
              { label: "philamikvah.org", href: "https://philamikvah.org/", external: true },
              { label: "Schedule / Appointments", href: "https://philamikvah.org/appointments/", external: true },
            ],
          },
          {
            title: "Notary services",
            body: "After-hours notarial services are available in exchange for a donation to Mekor.",
            links: [{ label: "ckopel@gmail.com", href: "mailto:ckopel@gmail.com" }],
          },
          {
            title: "Eruv support",
            body: "Recurring donations help cover repairs, supplies, and liability insurance for the Center City Eruv.",
            links: [{ label: "Donate to Eruv Support", href: "https://ccshul.us2.list-manage.com/track/click?u=f9fe87a16c42c24704c099073&id=78b2ea75cf&e=dac02e1995", external: true }],
          },
          {
            title: "Career strategy resources",
            body: "JEVS support includes resume review, mock interviews, and career transition support.",
            links: [
              { label: "Request referral", href: "mailto:mekorhabracha@gmail.com?subject=JEVS%20Referral" },
              {
                label: "JEVS career resources",
                href: "https://www.jevshumanservices.org/careerstrategies/",
                external: true,
              },
            ],
          },
        ],
      },
      {
        heading: "Community offers",
        entries: [
          {
            title: "Shiduch matchmaking",
            body: "Marriage-minded singles can create free profiles and work with volunteer matchmakers.",
            links: [{ label: "member@shiduch.org", href: "mailto:member@shiduch.org" }],
          },
          {
            title: "Mekor affiliate links",
            body: "When using designated links for Judaica and wine purchases, a percentage is returned to Mekor.",
            links: [
              { label: "Kosherwine", href: "https://tinyurl.com/mekorwine", external: true },
              { label: "Judaica", href: "https://tinyurl.com/mekorjudaica", external: true },
            ],
          },
          {
            title: "Kiyum Initiative",
            body: "Sponsor-a-scholar initiative supporting workforce pathways in Israel.",
            links: [{ label: "kiyuminitiative.org", href: "http://www.kiyuminitiative.org/", external: true }],
          },
        ],
      },
    ],
  },
  "/center-city-beit-midrash": {
    archetype: "info",
    path: "/center-city-beit-midrash",
    eyebrow: "Learning",
    title: "The Center City Beit Midrash (CCBM)",
    intro: [
      "CCBM is an inclusive, learning-centered initiative focused on deep engagement with Jewish texts and traditions.",
      "Programs include weekly classes, Shabbat learning, and daily Amud Yomi.",
    ],
    primaryLinks: [{ label: "Contact Us", href: "/contact-us" }],
    sections: [
      {
        heading: "Summer classes at Mekor",
        cards: [
          { title: "Talmud Brachot", body: "Tuesdays at 7:00 PM" },
          { title: "Religious Zionism", body: "Wednesdays at 7:00 PM" },
          { title: "Rupture and Reconstruction", body: "Thursdays at 7:00 PM" },
          { title: "Midrash Rabbah", body: "Fridays at 6:45 PM" },
        ],
        paragraphs: ["Contact Rabbi Gotlib for Zoom details."],
      },
      {
        heading: "Daily Amud Yomi Shiur - with cereal",
        paragraphs: [
          "A brief weekday shiur follows Shacharit and is open to all levels.",
          "Sunday: shiur follows 8:30 AM Shacharit. Monday-Friday: shiur starts around 7:40 AM and concludes by 8:00 AM.",
        ],
      },
      {
        heading: "Mission statement",
        paragraphs: [
          "CCBM provides high-quality educational experiences for those seeking meaningful engagement with Jewish learning.",
          "Through classes and Shabbat programming, participants deepen connection to Jewish study and communal life.",
        ],
      },
    ],
  },
  "/copy-of-center-city-beit-midrash": {
    archetype: "info",
    path: "/copy-of-center-city-beit-midrash",
    eyebrow: "Learning",
    title: "The Center City Beit Midrash (CCBM)",
    intro: [
      "Archived CCBM page containing workshop and project updates.",
      "Core mission and class framework remain aligned with current CCBM programming.",
    ],
    primaryLinks: [{ label: "Current CCBM Page", href: "/center-city-beit-midrash" }],
    sections: [
      {
        heading: "Summer classes at Mekor",
        cards: [
          { title: "Talmud Brachot", body: "Tuesdays at 7:00 PM" },
          { title: "Religious Zionism", body: "Wednesdays at 7:00 PM" },
          { title: "Rupture and Reconstruction", body: "Thursdays at 7:00 PM" },
          { title: "Midrash Rabbah", body: "Fridays at 6:45 PM" },
        ],
      },
      {
        heading: "Advocate for yourself workshop",
        paragraphs: [
          "A three-part interactive workshop on responding to antisemitism and anti-Israel rhetoric in practical, non-debate settings.",
        ],
        links: [
          { label: "drweinberg@outlook.com", href: "mailto:drweinberg@outlook.com" },
          { label: "(215) 219-6748", href: "tel:+12152196748" },
          { label: "jweinbergjdphd.com", href: "http://www.jweinbergjdphd.com/", external: true },
        ],
      },
      {
        heading: "Simchat Torah Project 2024/5785",
        paragraphs: [
          "Global initiative commemorating October 7 through dedicated Torah covers (me'ilim) for participating synagogues.",
          "Mekor's commemorative program included participation from alumni in Israel and continued communal remembrance through Simchat Torah.",
        ],
      },
    ],
  },
  "/philly-jewish-community": {
    archetype: "info",
    path: "/philly-jewish-community",
    eyebrow: "Local Jewish Resources",
    title: "Philly Jewish Community",
    intro: [
      "Center City's growing Jewish ecosystem is supported by communal institutions, volunteers, and neighborhood partnerships.",
      "This page highlights key resources connected to daily Jewish life in Philadelphia.",
    ],
    primaryLinks: [{ label: "Contact Us", href: "/contact-us" }],
    sections: [
      {
        heading: "Center City Eruv",
        paragraphs: [
          "The Center City Eruv covers much of Center City and South Philadelphia between the Schuylkill and Delaware corridors.",
          "Please check weekly status before Shabbat and review boundary updates carefully.",
        ],
        bullets: [
          "Schuylkill River Trail is no longer included.",
          "South of Washington Ave, areas west of 25th St are excluded.",
          "South Street Bridge connects to the University City Eruv when extension is up.",
          "Columbus Boulevard and waterfront remain outside the eruv.",
        ],
        links: [{ label: "Center City Eruv Map", href: "http://www.centercityeruv.org/map.asp", external: true }],
      },
      {
        heading: "Kosher establishments",
        paragraphs: [
          "Mekor volunteers and rabbinic leadership continue to support and expand kosher options throughout Center City.",
        ],
        links: [{ label: "Kosher Map", href: "/kosher-map" }, { label: "Kosher Places Directory", href: "/center-city" }],
      },
      {
        heading: "Mikvaot",
        paragraphs: [
          "The Mei Shalva Center City Community Mikvah at 509 Pine Street serves women, men, and keilim needs.",
          "Volunteers are welcome to support ongoing operations.",
        ],
        links: [
          { label: "philamikvah.org", href: "https://philamikvah.org/", external: true },
          { label: "Schedule appointment", href: "https://philamikvah.org/appointments/", external: true },
        ],
      },
    ],
  },
  "/testimonials": {
    archetype: "directory",
    path: "/testimonials",
    eyebrow: "Community Voices",
    title: "A Few of Mekor's Eclectic Testimonials",
    intro: [
      "Messages from members, visitors, alumni, and families reflecting on life at Mekor.",
      "The notes below are selected excerpts preserved from the original page.",
    ],
    secondaryLinks: [
      {
        label: "Pre-Passover letter",
        href: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/8ec79805bb1829cd0e6fc905afa857992bdc6c01-chana_strauss_dinner_speech_excerpt_12-2-22.pdf",
        external: true,
      },
    ],
    groups: [
      {
        heading: "Voices from the community",
        entries: [
          {
            title: "" ,
            body: "Thank you, Rabbi Hirsch, for being a role model, teacher, and friend. With incredible care and wisdom, you guide and support the community through life's greatest challenges.",
            quoteBy: "Member",
          },
          {
            title: "" ,
            body: "We're sponsoring Kiddush to thank the Mekor community for a warm welcome.",
            quoteBy: "Members",
          },
          {
            title: "" ,
            body: "Mekor Habracha will always hold a special place in our hearts; we will forever feel part of the family.",
            quoteBy: "Alum",
          },
          {
            title: "" ,
            body: "You made us feel like we were long-time members of your congregation.",
            quoteBy: "Visitor",
          },
          {
            title: "" ,
            body: "Thank you for the vibrant community over my years in Philly. I wanted to express my appreciation.",
            quoteBy: "Former community member",
          },
          {
            title: "" ,
            body: "Mekor has been a source of socializing, support, and spirituality for years. We love you very much.",
            quoteBy: "Member",
          },
          {
            title: "" ,
            body: "It's a wonderful kehilla. I am impressed with your dedication, intellect, and humanity.",
            quoteBy: "Visitor",
          },
          {
            title: "" ,
            body: "Thank you for creating a community where I can daven every Shabbat.",
            quoteBy: "Bat Mitzvah girl",
          },
        ],
      },
    ],
  },
  "/general-5": {
    archetype: "directory",
    path: "/general-5",
    eyebrow: "Kosher Restaurants",
    title: "Kosher Restaurants",
    intro: [
      "Philadelphia has a growing number of kosher establishments.",
      "Listings are provided for informational purposes; verify current certification with each location before visiting.",
    ],
    primaryLinks: [
      { label: "Center City Directory", href: "/center-city" },
      { label: "Main Line / Manyunk", href: "/main-line-manyunk" },
      { label: "Old York Road / Northeast", href: "/old-yorkroad-northeast" },
      { label: "Cherry Hill", href: "/cherry-hill" },
    ],
    groups: [
      {
        heading: "Center City highlights",
        entries: [
          {
            title: "20th Street Pizza",
            body: "Vegan pizzeria (IKC supervision)",
            details: ["108 S 20th St", "(215) 398-5748"],
            links: [{ label: "20thstreet.pizza", href: "http://20thstreet.pizza/", external: true }],
          },
          {
            title: "Bar Bombon",
            body: "Vegan food with Latin flavors (IKC supervision)",
            details: ["133 S 18th Street", "(267) 606-6612"],
          },
          {
            title: "Cafe 613 at Temple Hillel",
            body: "University cafeteria (Keystone K supervision)",
            details: ["1441 W Norris St", "(215) 777-9797"],
          },
          {
            title: "Charlie Was a Sinner",
            body: "Vegan restaurant and bar (IKC supervision)",
            details: ["131 S 13th St", "(267) 758-5372"],
          },
          {
            title: "Fitz on 4th",
            body: "Vegan tapas (IKC supervision)",
            details: ["743 S 4th St", "(215) 315-8989"],
            links: [{ label: "fitzon4th.com", href: "https://fitzon4th.com/", external: true }],
          },
          {
            title: "Goldie",
            body: "Vegan falafel shop (IKC supervision)",
            details: ["Multiple locations", "(267) 239-0777"],
            links: [{ label: "goldiefalafel.com", href: "http://goldiefalafel.com/", external: true }],
          },
          {
            title: "HipCityVeg",
            body: "Vegan fast-casual (IKC supervision)",
            details: ["Multiple locations"],
            links: [{ label: "hipcityveg.com", href: "https://hipcityveg.com/philadelphia/", external: true }],
          },
          {
            title: "Luhv",
            body: "Vegan deli and bistro (IKC supervision)",
            details: ["Reading Terminal and South Philly locations"],
            links: [{ label: "luhvfood.com", href: "https://www.luhvfood.com/", external: true }],
          },
        ],
      },
      {
        heading: "Additional categories",
        entries: [
          {
            title: "Bakery",
            body: "Zevi's Bakery, New York Bagel Bakery",
          },
          {
            title: "Cafe",
            body: "Say She Ate Cafe, Kosher Corner at Temple University",
          },
          {
            title: "Restaurants",
            body: "Casa Borinquena and additional supervised options",
          },
        ],
      },
    ],
  },
  "/old-kosher-restaurants": {
    archetype: "directory",
    path: "/old-kosher-restaurants",
    eyebrow: "Archive",
    title: "Old Kosher Restaurants",
    intro: [
      "Archived location list preserved from the legacy page.",
      "Availability and supervision status may have changed; confirm before visiting.",
    ],
    secondaryLinks: [
      { label: "Current Kosher Directory", href: "/center-city" },
      {
        label: "Community article",
        href: "https://www.jewishexponent.com/mekor-habracha-continues-to-bring-orthodox-vibrancy-to-center-city/?fbclid=IwAR2dLOS-bHeHyQ45lZRy9TACb47Gn-ii_Q1PZK88zrbYAHRC9d5O8rHBK_4",
        external: true,
      },
    ],
    groups: [
      {
        heading: "Legacy locations",
        entries: [
          {
            title: "20th Street Pizza",
            details: ["108 S 20th St, Philadelphia, PA 19103", "+1 215-398-5748"],
            links: [
              { label: "Website", href: "https://20thstreet.pizza/", external: true },
              { label: "Map", href: "https://maps.google.com/?cid=16653700271126880744", external: true },
            ],
          },
          {
            title: "Algorithm Vegan Grill",
            details: ["705 E Passyunk Ave, Philadelphia, PA 19147", "+1 267-827-2022"],
            links: [
              { label: "Website", href: "http://www.algorithm-restaurants.com/", external: true },
              { label: "Map", href: "https://maps.google.com/?cid=12929026737050892195", external: true },
            ],
          },
          {
            title: "Bar Bombon",
            details: ["133 S 18th St, Philadelphia, PA 19103", "+1 267-606-6612"],
            links: [
              { label: "Website", href: "http://barbombon.com/", external: true },
              { label: "Map", href: "https://maps.google.com/?cid=4248196671749725236", external: true },
            ],
          },
          {
            title: "Charlie was a sinner.",
            details: ["131 S 13th St, Philadelphia, PA 19107", "+1 267-758-5372"],
            links: [
              { label: "Website", href: "http://charliewasasinner.com/", external: true },
              { label: "Map", href: "https://maps.google.com/?cid=7264192126620954222", external: true },
            ],
          },
          {
            title: "Penn Hillel",
            details: ["215 S 39th St, Philadelphia, PA 19104", "+1 215-898-7391"],
            links: [
              { label: "Website", href: "http://www.pennhillel.org/", external: true },
              { label: "Map", href: "https://maps.google.com/?cid=2225219721565123252", external: true },
            ],
          },
          {
            title: "Fitz on 4th",
            details: ["743 S 4th St, Philadelphia, PA 19147", "+1 215-315-8989"],
            links: [
              { label: "Website", href: "https://fitzon4th.com/", external: true },
              { label: "Map", href: "https://maps.google.com/?cid=5380130284688254533", external: true },
            ],
          },
          {
            title: "Goldie",
            details: ["Multiple Philadelphia locations", "+1 267-239-0777"],
            links: [
              { label: "Website", href: "http://goldiefalafel.com/", external: true },
              { label: "Map (Center City)", href: "https://maps.google.com/?cid=17810134926841026466", external: true },
            ],
          },
          {
            title: "HipCityVeg",
            details: ["Multiple Philadelphia locations"],
            links: [{ label: "Website", href: "https://hipcityveg.com/philadelphia/", external: true }],
          },
          {
            title: "Luhv Vegan Bistro / Deli",
            details: ["1131 S 19th St and 51 N 12th St"],
            links: [
              { label: "Bistro", href: "https://www.luhvfood.com/", external: true },
              { label: "Deli", href: "https://deli.luhvfood.com/", external: true },
            ],
          },
          {
            title: "Miss Rachel's Pantry",
            details: ["1938 S Chadwick St, Philadelphia, PA 19145", "+1 215-821-8478"],
            links: [
              { label: "Website", href: "https://www.missrachelspantry.com/", external: true },
              { label: "Map", href: "https://maps.google.com/?cid=8078682791318707398", external: true },
            ],
          },
          {
            title: "Monster Vegan",
            details: ["1229 Spruce St, Philadelphia, PA 19107", "+1 215-790-9494"],
            links: [{ label: "Website", href: "https://themonstervegan.com/", external: true }],
          },
          {
            title: "P.S. & Co.",
            details: ["1706 Locust St, Philadelphia, PA 19103", "+1 215-985-1706"],
            links: [{ label: "Website", href: "https://psandco.com/", external: true }],
          },
          {
            title: "Joy Cafe",
            details: ["630 N 2nd St, Philadelphia, PA 19123"],
            links: [{ label: "Website", href: "https://www.myjoycafe.com/", external: true }],
          },
          {
            title: "Su Xing House",
            details: ["1508 Sansom St, Philadelphia, PA 19102", "+1 215-564-2949"],
            links: [{ label: "Website", href: "https://www.chengduphilly.com/", external: true }],
          },
          {
            title: "The Tasty",
            details: ["1401 S 12th St, Philadelphia, PA 19147", "+1 267-457-5670"],
            links: [{ label: "Website", href: "https://www.thetastyphilly.com/", external: true }],
          },
          {
            title: "Unit Su Vege",
            details: ["2000 Hamilton St #106, Philadelphia, PA 19130", "+1 215-988-1888"],
            links: [{ label: "Website", href: "http://www.unitsuvege.com/", external: true }],
          },
          {
            title: "Ben & Jerry's (UPenn)",
            details: ["218 S 40th St, Philadelphia, PA 19104", "+1 215-382-5092"],
            links: [{ label: "Website", href: "https://www.benjerry.com/upenn", external: true }],
          },
          {
            title: "Center City Pretzel Co.",
            details: ["816 Washington Ave, Philadelphia, PA 19147", "+1 215-463-5664"],
            links: [{ label: "Website", href: "http://www.centercitypretzel.com/", external: true }],
          },
        ],
      },
    ],
  },
};

export const MEDIUM_STATIC_ARCHETYPE_MAP: Record<MediumStaticPath, MediumStaticPageConfig["archetype"]> = {
  "/donations": "info",
  "/visit-us": "contact",
  "/contact-us": "contact",
  "/our-communities": "info",
  "/davening": "info",
  "/mekor-bulletin-board": "directory",
  "/center-city-beit-midrash": "info",
  "/copy-of-center-city-beit-midrash": "info",
  "/philly-jewish-community": "info",
  "/testimonials": "directory",
  "/general-5": "directory",
  "/old-kosher-restaurants": "directory",
};

export function getMediumStaticPageConfig(path: MediumStaticPath) {
  return MEDIUM_STATIC_PAGE_CONFIGS[path];
}
