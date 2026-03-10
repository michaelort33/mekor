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
  hero: "/images/bulletin-board/hero.jpg",
  banner: "/images/bulletin-board/banner.jpg",
} as const;

const ERUV_DONATION_LINK =
  "https://ccshul.us2.list-manage.com/track/click?u=f9fe87a16c42c24704c099073&id=78b2ea75cf&e=dac02e1995";

const COMMUNITY_UPDATES: BulletinCard[] = [
  {
    title: "Become an Eruv Checker",
    paragraphs: [
      "Several of our eruv checkers have left the area, and we need new volunteers.",
      "If you have a bicycle or car, and you could help out once every 6 weeks, or even less often, please sign up. Training will be provided.",
    ],
    links: [
      { label: "Harry Schley", href: "mailto:harry@schley.com" },
      { label: "Volunteer at Mekor", href: "/team-4" },
    ],
  },
  {
    title: "Seeking Volunteer Mashgiachs",
    paragraphs: [
      "It is exciting that our list of Center City kosher restaurants is expanding once again, but we rely on volunteers to help in this process.",
      "No experience is necessary. Rabbi Hirsch will provide training.",
    ],
    links: [
      { label: "Email the Shul", href: "mailto:mekorhabracha@gmail.com?subject=Mashgiach%20Volunteers" },
      { label: "Kosher Guide", href: "/kosher-map" },
    ],
  },
  {
    title: "Center City Mikvah Is Open",
    paragraphs: [
      "We're excited to announce that the Mei Shalva Center City Community Mikvah, located at 509 Pine Street, is now open. The women's mikvah, men's mikvah, and keilim mikvah are all operational.",
      "We are currently seeking volunteers to help staff the keilim mikvah. Mazal Tov to the entire Center City Jewish community on this meaningful milestone.",
    ],
    links: [
      { label: "Mikvah Schedule", href: "https://philamikvah.org/" },
      { label: "Call/Text 267-225-2651", href: "tel:+12672252651" },
    ],
  },
  {
    title: "Notary Service to Benefit Mekor",
    paragraphs: [
      "Need something notarized in Philadelphia after work hours? Mekor member Chesky Kopel is a licensed Pennsylvania notary public.",
      "He will provide notarial services in exchange for a small donation to the shul.",
    ],
    links: [{ label: "Contact Chesky", href: "mailto:ckopel@gmail.com" }],
  },
  {
    title: "The Center City Eruv Needs Your Financial Support",
    paragraphs: [
      "The Eruv plays a vital role in our vibrant Center City Jewish community life, but is often taken for granted. Repairs, materials, and liability insurance total over $10,000 per year.",
      "If you and your family benefit from our Eruv, we respectfully ask that you make a recurring monthly donation of at least $18.",
    ],
    links: [
      { label: "Donate to the Eruv", href: ERUV_DONATION_LINK },
      { label: "General Donations", href: "/donations" },
    ],
  },
  {
    title: "Orthodox Union Tehillim",
    paragraphs: [
      "Daily at 1 pm; to participate, dial (773) 377-9170.",
      "Please join the Orthodox Union community for the recitation of Tehillim, chapters 20, 27 and 130, and divrei chizuk from our rabbanim each afternoon at 1:00 PM EDT.",
    ],
    links: [{ label: "Dial (773) 377-9170", href: "tel:+17733779170" }],
  },
  {
    title: "Weekly Online Parsha Shiur",
    paragraphs: [
      "Live on Thursdays at 1:00 pm EST; online on-demand.",
      "Mekor member Dr. Saundra Sterling Epstein, Sunnie, gives a weekly Parsha shiur on Melrose B'nai Israel Emanu El's Facebook page.",
    ],
    links: [{ label: "Watch on Facebook", href: "https://www.facebook.com/groups/mbiee.org" }],
  },
];

const COMMUNITY_ANNOUNCEMENTS: BulletinCard[] = [
  {
    title: "East-of-Broad Home Listing",
    paragraphs: [
      "We are selling our East of Broad ~2,000 square foot home in the spring, 3 bedrooms and 2 baths, on a beautiful quiet side street right off of Bainbridge.",
      "The home is bright and combines turn-of-the-century architectural details with modern urban living features. We will still be your neighbor, as we are only moving a block away.",
    ],
    links: [{ label: "Inquire by Email", href: "mailto:yoella.epstein@gmail.com" }],
  },
  {
    title: "Akiladelphia Contractor Offer",
    paragraphs: [
      "Akiladelphia Creative Contracting will donate 5% of your job cost to Mekor. Senior discount also available.",
      "For more info, contact (215) 589-5405 or akiladelphia@gmail.com.",
    ],
    links: [
      { label: "Website", href: "http://akiladelphia.com/" },
      { label: "Call (215) 589-5405", href: "tel:+12155895405" },
      { label: "Email", href: "mailto:akiladelphia@gmail.com" },
    ],
  },
  {
    title: "Health and Wellness Offer",
    paragraphs: [
      "Mekor member David Parvey has launched a health and wellness company utilizing unique CBD formulas to assist in balancing out your day. He is offering a 20% discount to Mekor members using discount code MEKORMEMBER.",
      "All products are vegan, third-party tested, and all proceeds will be split with the shul.",
    ],
    links: [{ label: "Visit wefreeco.com", href: "http://www.wefreeco.com/" }],
  },
  {
    title: "Free Career Guidance at JEVS",
    paragraphs: [
      "JEVS provides assistance with resumes, practice mock interviews, and more to those who are seeking a job or looking to change jobs.",
      "For congregants referred by Rabbi Hirsch, there will be no charge for the first visit. Other visits are on a sliding fee scale or free depending on income.",
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
      "Kiyum partners with institutions in Jerusalem to help Haredi individuals enter the labor pool through stipends, education, and job placement.",
      "We are raising funds and building awareness for the upcoming academic year to consist of 55 students, and so we are seeking donations to Sponsor-A-Scholar.",
    ],
    links: [{ label: "Learn More", href: "http://www.kiyuminitiative.org/" }],
  },
  {
    title: "Jewish Matchmaking -- Shiduch.org",
    paragraphs: [
      "We are a Jewish matchmaking site for marriage-minded singles worldwide. Singles can create a free profile on the site, and matchmakers will search through the database for compatible matches.",
    ],
    links: [
      { label: "Visit shiduch.org", href: "https://shiduch.org" },
      { label: "Contact Rachel", href: "mailto:member@shiduch.org" },
    ],
  },
];

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
        eyebrow="Community Resources"
        title="Mekor Bulletin Board"
        subtitle="Announcements, opportunities, and useful links for our community"
        image={{
          src: BULLETIN_IMAGES.hero,
          alt: "Mekor bulletin board and community updates",
          objectFit: "cover",
          objectPosition: "50% 34%",
        }}
        description={[
          "This board brings together the latest community notices, volunteer opportunities, support resources, and practical contacts.",
          "Every section below keeps the original bulletin board contacts and wording while preserving the new page design.",
        ]}
        actions={[
          { label: "View Updates", href: "#community-updates" },
          { label: "Community Announcements", href: "#community-announcements" },
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
          <p className={styles.bannerTitle}>A Living Bulletin for the Community</p>
          <p className={styles.bannerText}>
            From volunteer opportunities and learning programs to practical services and local announcements, this
            page centralizes what people need most.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Community Updates"
        description="Current opportunities and notices from Mekor."
      >
        <div id="community-updates" className={styles.anchor} />
        <div className={styles.noticeGrid}>
          {COMMUNITY_UPDATES.map((item) => (
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
      </SectionCard>

      <SectionCard
        title="Jewish Community Events and Announcements"
        description="Useful local notices shared with the Mekor community."
      >
        <div id="community-announcements" className={styles.anchor} />
        <div className={styles.noticeGrid}>
          {COMMUNITY_ANNOUNCEMENTS.map((item) => (
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
      </SectionCard>

      <SectionCard title="Support Mekor" className={styles.supportCard}>
        <div id="support-mekor" className={styles.anchor} />
        <p className={styles.supportLead}>
          If you use the following Mekor-specific links when ordering from Kosherwine.com and Judaica.com, Mekor will
          earn 5% back.
        </p>
        <p className={styles.supportNote}>
          You can also support the Center City Eruv directly and donate to Mekor through our donations page.
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
            { label: "Latest Newsletters Archive", href: "https://us2.campaign-archive.com/home/?u=f9fe87a16c42c24704c099073&id=94f3350887" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
