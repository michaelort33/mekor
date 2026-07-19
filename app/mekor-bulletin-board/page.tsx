import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/mekor-bulletin-board" as const;

type BulletinCard = {
  title: string;
  paragraphs: string[];
  links: { label: string; href: string }[];
};

const BULLETIN_IMAGES = {
  hero: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/cd923011bc83f65310ae6f95f70089297ac15123-hero.jpg",
  banner: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/6232f3d6a49758d6fe2d88551b5e72e6b5861a20-banner.jpg",
} as const;

const ERUV_DONATION_LINK =
  "https://ccshul.us2.list-manage.com/track/click?u=f9fe87a16c42c24704c099073&id=78b2ea75cf&e=dac02e1995";

const ERUV_CAMPAIGN_TEAM =
  "https://thechesedfund.com/centercityeruv/ep2026/teams/mekorhabracha";

const ERUV_CAMPAIGN_INFO = "https://thechesedfund.com/centercityeruv/ep2026";

const ZIONISM_CLASS_RSVP = "https://forms.gle/aDkUYeBj3qvudcMD9";

/** Standing items that used to repeat every week in the Shabbat newsletter. */
const STANDING_INFO: BulletinCard[] = [
  {
    title: "Tot Shabbat",
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
    paragraphs: [
      "Mekor publishes a Yizkor Book for Yom Kippur, Shemini Atzeret, Pesach, and Shavuot. Submission deadline: September 1, 2026 at 12:00pm. Contributions by check payable to the shul are welcome.",
    ],
    links: [
      {
        label: "Email Yizkor submissions",
        href: "mailto:mekorhabracha@gmail.com?subject=Yizkor%20Book%202026-2027",
      },
    ],
  },
];

const FEATURED_NOW: BulletinCard[] = [
  {
    title: "Strengthen the Center City Eruv",
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

const COMMUNITY_UPDATES: BulletinCard[] = [
  {
    title: "Become an Eruv Checker",
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
    paragraphs: [
      "Need something notarized in Philadelphia after work hours? Mekor member Chesky Kopel is a licensed Pennsylvania notary public and will provide notarial services in exchange for a small donation to the shul. For more information, contact Chesky at ckopel@gmail.com.",
    ],
    links: [{ label: "Contact Chesky", href: "mailto:ckopel@gmail.com" }],
  },
  {
    title: "The Center City Eruv needs your financial support!",
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
    paragraphs: [
      "Daily at 1 pm; to participate, dial (773) 377- 9170.",
      "Please join the Orthodox Union community for the recitation of Tehillim (chapters 20, 27 and 130) and divrei chizuk (words of inspiration) from our rabbanim each afternoon at 1:00PM EDT.",
    ],
    links: [{ label: "Dial (773) 377-9170", href: "tel:+17733779170" }],
  },
  {
    title: "Weekly Online Parsha Shiur",
    paragraphs: [
      "Live on Thursdays at 1:00 pm EST; online on-demand.",
      "Mekor member Dr. Saundra Sterling Epstein (Sunnie) gives a weekly Parsha shiyur on Melrose B'nai Israel Emanu El's (MBIEE) Facebook page. To access, visit https://www.facebook.com/groups/mbiee.org. If required, you will be invited in by the administrator.",
    ],
    links: [{ label: "Watch on Facebook", href: "https://www.facebook.com/groups/mbiee.org" }],
  },
];

const COMMUNITY_ANNOUNCEMENTS: BulletinCard[] = [
  {
    title: "Jewish Community Events & Announcements",
    paragraphs: [
      "We are selling our East of Broad ~2,000 square foot home in the spring (3 bedrooms, 2 baths, on a beautiful, quiet side street right off of Bainbridge; finished basement not included in square footage).",
      "The home is bright and combines turn-of-the-century interior architectural details (e.g., high ceilings and original random width floors) with modern, urban living features (e.g., exposed brick and top-of-line kitchen appliances). We will still be your neighbor, as we are only moving a block away. Please email yoella.epstein@gmail.com if you are interested in finding out more.",
    ],
    links: [{ label: "Inquire by Email", href: "mailto:yoella.epstein@gmail.com" }],
  },
  {
    title: "Need a contractor? Special Offer for Mekor Community",
    paragraphs: [
      "Akiladelphia Creative Contracting will donate 5% of the cost of your job to Mekor. Senior discount also.",
      "For more info, contact (215) 589-5405 or akiladelphia@gmail.com.",
    ],
    links: [
      { label: "Akiladelphia website", href: "http://akiladelphia.com/" },
      { label: "Call (215) 589-5405", href: "tel:+12155895405" },
      { label: "Email", href: "mailto:akiladelphia@gmail.com" },
    ],
  },
  {
    title: "Health & Wellness Offer for Mekor Community",
    paragraphs: [
      "Mekor member David Parvey has launched a health and wellness company utilizing unique CBD formulas to assist in balancing out your day. He is offering a 20% discount to Mekor members using discount code \"MEKORMEMBER\" and all proceeds will be split with the shul.",
      "All products are vegan, 3rd-party tested and can be found at www.wefreeco.com.",
    ],
    links: [{ label: "Visit wefreeco.com", href: "http://www.wefreeco.com/" }],
  },
  {
    title: "Free Career Guidance at JEVS",
    paragraphs: [
      "JEVS provides assistance (resumes, practice mock interviews, etc.) to those who are seeking a job or looking to change jobs. For congregants referred by Rabbi Hirsch, there will be no charge for the first visit. Other visits are on a sliding fee scale or free depending on income.",
      "If you wish to schedule your 1st visit free of charge, please email the shul, and Rabbi Hirsch will make the referral. Then call Wendy Rosenfeldt at 215-832-0878 to schedule your appointment. For info about free webinars about job searching, visit https://www.jevshumanservices.org/careerstrategies/.",
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
    paragraphs: [
      "The Kiyum Initiative has tailored a program along with leading institutions in Jerusalem to enable the entry of Haredi individuals into the labor pool through a combination of living stipends, enhanced education, and job placement.",
      "We are raising funds and building awareness for the upcoming academic year to consist of 55 students, and so we are seeking donations to Sponsor-A-Scholar.",
    ],
    links: [{ label: "Kiyum Initiative website", href: "http://www.kiyuminitiative.org/" }],
  },
  {
    title: "Jewish Matchmaking -- Shiduch.org",
    paragraphs: [
      "We are a Jewish matchmaking site for marriage-minded singles worldwide. Singles can create a FREE profile on the site, and our matchmakers will search through our database for compatible matches. If you'd like more info, please visit shiduch.org or contact Rachel at member@shiduch.org.",
    ],
    links: [
      { label: "Visit shiduch.org", href: "https://shiduch.org" },
      { label: "Contact Rachel", href: "mailto:member@shiduch.org" },
    ],
  },
];

function NoticeGrid({ items }: { items: BulletinCard[] }) {
  return (
    <div className={styles.noticeGrid}>
      {items.map((item) => (
        <article key={item.title} className={styles.noticeCard}>
          <h3>{item.title}</h3>
          {item.paragraphs.map((paragraph, index) => (
            <p key={`${item.title}-${index}`}>{paragraph}</p>
          ))}
          <div className={styles.noticeLinks}>
            {item.links.map((link) => (
              <a
                key={`${item.title}-${link.href}`}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noreferrer noopener" : undefined}
                className={styles.noticeLink}
              >
                {link.label}
              </a>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function BulletinBoardPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Community Hub"
        title="Mekor Bulletin Board"
        subtitle="Standing community info in one place — so the homepage and weekly newsletter stay focused."
        image={{
          src: BULLETIN_IMAGES.hero,
          alt: "Mekor bulletin board and community updates",
          objectFit: "cover",
          objectPosition: "50% 34%",
        }}
        description=""
        actions={[
          { label: "Standing info", href: "#standing-info" },
          { label: "Featured now", href: "#featured-now" },
          { label: "Support Mekor", href: "#support-mekor" },
        ]}
      />

      <SectionCard className={styles.bannerCard}>
        <Image
          src={BULLETIN_IMAGES.banner}
          alt="Mekor bulletin board banner"
          width={1366}
          height={355}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={styles.bannerImage}
          loading="lazy"
        />
        <div className={styles.bannerBody}>
          <p className={styles.bannerTitle}>One board for repeating community info</p>
          <p className={styles.bannerText}>
            Tot Shabbat, membership, Hebrew Help, wine &amp; Judaica links, volunteering, and other standing notices
            live here. The weekly Shabbat newsletter highlights this week&apos;s schedule, sponsors, and fresh
            announcements — then points back to this board.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Standing Community Info"
        description="Evergreen programs and links that used to repeat in every weekly newsletter."
      >
        <div id="standing-info" className={styles.anchor} />
        <NoticeGrid items={STANDING_INFO} />
      </SectionCard>

      <SectionCard
        title="Featured Now"
        description="Time-sensitive campaigns and classes — linked from the homepage instead of repeating full write-ups."
      >
        <div id="featured-now" className={styles.anchor} />
        <NoticeGrid items={FEATURED_NOW} />
      </SectionCard>

      <SectionCard
        title="Community Updates"
        description="Current opportunities and notices from Mekor."
      >
        <div id="community-updates" className={styles.anchor} />
        <NoticeGrid items={COMMUNITY_UPDATES} />
      </SectionCard>

      <SectionCard
        title="Jewish Community Events and Announcements"
        description="Useful local notices shared with the Mekor community."
      >
        <div id="community-announcements" className={styles.anchor} />
        <NoticeGrid items={COMMUNITY_ANNOUNCEMENTS} />
      </SectionCard>

      <SectionCard title="Support Mekor" className={styles.supportCard}>
        <div id="support-mekor" className={styles.anchor} />
        <p className={styles.supportLead}>
          If you use the following Mekor-specific links when ordering from Kosherwine.com and Judaica.com, Mekor will
          earn 5% back!
        </p>
        <p className={styles.supportNote}>
          https://tinyurl.com/mekorwine https://tinyurl.com/mekorjudaica
        </p>
        <CTACluster
          items={[
            { label: "Kosherwine.com via Mekor Link", href: "https://tinyurl.com/mekorwine" },
            { label: "Judaica.com via Mekor Link", href: "https://tinyurl.com/mekorjudaica" },
            { label: "Center City Eruv Donation", href: ERUV_DONATION_LINK },
            { label: "Donate to Mekor", href: "/donations" },
          ]}
          className={styles.supportCluster}
        />
      </SectionCard>

      <SectionCard title="Quick Contacts and Links">
        <CTACluster
          items={[
            { label: "General Shul Email", href: "mailto:mekorhabracha@gmail.com" },
            { label: "Call the Office: (215) 525-4246", href: "tel:+12155254246" },
            { label: "Mikvah Website", href: "https://philamikvah.org/" },
            { label: "Past Newsletters", href: "/newsletters" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
