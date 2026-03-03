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
      "If you have a bicycle or car and can help once every 6 weeks (or even less often), please sign up. Training is provided.",
    ],
    links: [
      { label: "Harry Schley", href: "mailto:harry@schley.com" },
      { label: "Volunteer at Mekor", href: "/team-4" },
    ],
  },
  {
    title: "Seeking Volunteer Mashgiachs",
    paragraphs: [
      "Our list of Center City kosher restaurants is expanding again, and we rely on volunteers to help in this process.",
      "No experience is necessary. Rabbi Hirsch provides training.",
    ],
    links: [
      { label: "Email the Shul", href: "mailto:mekorhabracha@gmail.com?subject=Mashgiach%20Volunteers" },
      { label: "Kosher Guide", href: "/kosher-map" },
    ],
  },
  {
    title: "Center City Mikvah Is Open",
    paragraphs: [
      "Mei Shalva Center City Community Mikvah, located at 509 Pine Street, is now open. Women's mikvah, men's mikvah, and keilim mikvah are operational.",
      "Volunteers are needed to help staff the keilim mikvah.",
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
      "Notarial services are provided in exchange for a small donation to the shul.",
    ],
    links: [{ label: "Contact Chesky", href: "mailto:ckopel@gmail.com" }],
  },
  {
    title: "The Center City Eruv Needs Your Financial Support",
    paragraphs: [
      "The Eruv is vital to Center City Jewish community life. Repairs, materials, and liability insurance cost more than $10,000 per year.",
      "If your family benefits from the Eruv, please consider a recurring monthly donation of at least $18.",
    ],
    links: [
      { label: "Donate to the Eruv", href: ERUV_DONATION_LINK },
      { label: "General Donations", href: "/donations" },
    ],
  },
  {
    title: "Orthodox Union Tehillim",
    paragraphs: [
      "Daily at 1:00 pm. Join for recitation of Tehillim (chapters 20, 27, and 130) and divrei chizuk from rabbanim.",
    ],
    links: [{ label: "Dial (773) 377-9170", href: "tel:+17733779170" }],
  },
  {
    title: "Weekly Online Parsha Shiur",
    paragraphs: [
      "Live on Thursdays at 1:00 pm EST and available on-demand.",
      "Mekor member Dr. Saundra Sterling Epstein (Sunnie) gives a weekly Parsha shiur on MBIEE's Facebook page.",
    ],
    links: [{ label: "Watch on Facebook", href: "https://www.facebook.com/groups/mbiee.org" }],
  },
];

const COMMUNITY_ANNOUNCEMENTS: BulletinCard[] = [
  {
    title: "East-of-Broad Home Listing",
    paragraphs: [
      "A ~2,000 sq ft East-of-Broad home (3 beds, 2 baths) is available, with turn-of-the-century details and modern updates.",
      "Finished basement is not included in listed square footage. Owners are moving only one block away.",
    ],
    links: [{ label: "Inquire by Email", href: "mailto:yoella.epstein@gmail.com" }],
  },
  {
    title: "Akiladelphia Contractor Offer",
    paragraphs: [
      "Akiladelphia Creative Contracting will donate 5% of your job cost to Mekor. Senior discount also available.",
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
      "Mekor member David Parvey offers a 20% member discount with code MEKORMEMBER through wefreeco.",
      "Products are vegan, third-party tested, and proceeds are split with the shul.",
    ],
    links: [{ label: "Visit wefreeco.com", href: "http://www.wefreeco.com/" }],
  },
  {
    title: "Free Career Guidance at JEVS",
    paragraphs: [
      "JEVS supports resumes, interview prep, and job transitions.",
      "For congregants referred by Rabbi Hirsch, first visit is free. Additional visits are sliding scale or free depending on income.",
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
      "Funds are being raised to support 55 students in the upcoming academic year.",
    ],
    links: [{ label: "Learn More", href: "http://www.kiyuminitiative.org/" }],
  },
  {
    title: "Jewish Matchmaking -- Shiduch.org",
    paragraphs: [
      "Shiduch.org is a Jewish matchmaking site for marriage-minded singles worldwide with free profiles and matchmaker support.",
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
          "Every section below is native React/TypeScript and includes the contact details from the original bulletin board.",
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
          If you use Mekor-specific affiliate links when ordering from Kosherwine.com and Judaica.com, Mekor earns 5%
          back.
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
