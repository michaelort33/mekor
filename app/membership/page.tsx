import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { getHebrewYearContext } from "@/lib/calendar/hebrew-year";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import { EruvSupportPrompt } from "./eruv-support-prompt";
import styles from "./page.module.css";

const PATH = "/membership" as const;
const MEMBERSHIP_FORM_URL = "/membership/apply";

const MEMBERSHIP_IMAGES = {
  hero:
    "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/006a4828aa5979b285c868bad4007638a92662e1-11062b_6ef3ee78b5784e3586f8a9366c89f5ee-mv2.jpeg",
  community:
    "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/a52c76f4e31a3d50a174447141becbdb4721aa85-92f487_1b9e6a717396499c912c95ed541884b4-mv2.jpg",
  benefits:
    "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/8ddca325da346dbcab563b9d7d151a4acdadd4e0-92f487_e06bca9eef7844c4b8dbaef89fa60417-mv2.jpeg",
  join:
    "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/a52c76f4e31a3d50a174447141becbdb4721aa85-92f487_1b9e6a717396499c912c95ed541884b4-mv2.jpg",
} as const;

const MEMBERSHIP_RATE_ROWS = [
  ["Single Membership", "$1000"],
  ["Couple/Family Membership", "$2,000"],
  ["Student Membership", "$500"],
] as const;

const AUXILIARY_MEMBERSHIP_RATES = [
  ["Family / Couple", "$1,000"],
  ["Single Adult", "$500"],
  ["Single Student", "$250"],
] as const;

// Verbatim from the old mekorhabracha.org/membership page — do not paraphrase.
const COMMUNITY_BENEFITS = [
  "A warm, inviting community that welcomes people of all ages & levels of observance",
  "Shabbat, holiday, and weekday services, for you and your visiting family, in a beautiful, handicapped accessible space in the heart of Center City",
  "Kiddushim every Shabbat & Yom Tov",
  "Community Shabbat & Yom Tov meals",
  "Special programming & holiday festivities for both children & adults",
  "Torah study and special classes at all levels, from beginner to advanced",
  "Halachic, spiritual, and life guidance",
  "A plethora of Kosher eateries under responsible supervision",
  "A fully functioning Eruv that covers all of Center City and adjoining neighborhoods",
  "And the countless other ways Mekor Habracha enriches Jewish life in Center City and beyond!",
] as const;

// Verbatim from the old mekorhabracha.org/membership page — do not paraphrase.
const MEMBER_BENEFITS = [
  "Free High Holiday seats & discounted guest rates",
  "Meaningful, Jewish-oriented Children's Program",
  "Community-wide announcements of life cycle events",
  "A warm, caring community to celebrate your joyful occasions, such as graduations, weddings & births, and support you during difficult times, such as illness, loss of loved ones, & commemoration of yahrtzeits",
  "Mekor's meal train to help during those events",
  "For life cycle ceremonies & celebrations (e.g., bris; baby naming), use of shul at no charge (conditions apply)",
  "Discounts on Kiddush sponsorships ($295 for members / $360 for non-members)",
  "Discounts on shul rentals for private events",
  "Discounts on certain special programs & meals",
  "Invitation to Annual Mekor Habracha Meeting",
  "Classes to assist potential converts become productive members of the Jewish community",
  "And much, much more!",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function MembershipPage() {
  const document = await getNativeDocumentByPath(PATH);
  const hebrewYear = getHebrewYearContext();

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.content}>
      <HeroSection
        eyebrow="Membership"
        title="Join Mekor Habracha!"
        subtitle="Membership in Mekor Habracha"
        variant="quiet"
        image={{
          src: MEMBERSHIP_IMAGES.hero,
          alt: "Mekor Habracha community gathering",
          objectFit: "cover",
          objectPosition: "50% 44%",
        }}
        description={[
          "We offer 2 simple ways to join or renew: choose one of the membership options below, or email us.",
        ]}
        actions={[
          { label: "Join Now!", href: MEMBERSHIP_FORM_URL },
          { label: "Email admin@mekorhabracha.org", href: "mailto:admin@mekorhabracha.org?subject=Membership%20Question" },
        ]}
      />

      <SectionCard className={styles.overviewCard}>
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCopy}>
            <h2 className={styles.panelTitle}>We offer 2 simple ways to join or renew:</h2>
            <p className={styles.leadText}>
              We try to make everyone, member &amp; nonmember alike, feel welcome in our community. Visitors to our shul
              speak glowingly about the way we assist them in so many ways. But our shul can&apos;t live on love alone!
            </p>
            <p className={styles.bodyText}>
              Mekor Habracha cannot exist and provide so many services without paying members and the generosity of
              donors. The Center City Jewish life that you enjoy depends on Mekor Habracha, and Mekor Habracha depends
              on membership dues. When you join, you become part of a shul community which will always feel great
              devotion to its loyal members.
            </p>
          </div>

          <aside className={styles.overviewAside}>
            <ol className={styles.factList}>
              <li>Choose one of the membership options below</li>
              <li>
                Email{" "}
                <a href="mailto:admin@mekorhabracha.org?subject=Membership%20Question">admin@mekorhabracha.org</a>
              </li>
            </ol>
            <p className={styles.asideNote}>
              Please note: If you prefer to join or renew via email, simply let us know whether you&apos;re renewing your
              membership or joining for the first time. Please also specify your desired membership type and your preferred
              payment method (e.g., Venmo, PayPal, or personal check).
            </p>
            <p className={styles.asideNote}>
              <Link href="/auxiliary-membership">Auxiliary Membership rates</Link> are available for those living outside
              Center City Philadelphia.
            </p>
          </aside>
        </div>
      </SectionCard>

      <SectionCard title="Membership Categories & Rates">
        <p className={styles.intro}>
          Year {hebrewYear.currentHebrewYearLabel} ({hebrewYear.currentCivilSpanLabel}) Membership Rates For new &amp;
          renewing members:
        </p>
        <div className={styles.rateGrid}>
          {MEMBERSHIP_RATE_ROWS.map(([label, amount]) => (
            <article className={styles.rateCard} key={label}>
              <p className={styles.rateTitle}>{label}</p>
              <p className={styles.rateAmount}>{amount}</p>
              <p className={styles.rateTerm}>Until Rosh Hashana {hebrewYear.nextRoshHashanaHebrewYearLabel}</p>
              <Link href={MEMBERSHIP_FORM_URL} className={styles.inlineAction}>
                Join Now!
              </Link>
            </article>
          ))}
        </div>
        <div className={styles.noteStack}>
          <p className={styles.note}>We also request a suggested donation of <strong>$100</strong> as a security fee.</p>
          <p className={styles.note}>We also request a <strong>$180</strong> eruv fee to support the Center City Eruv.</p>
          <p className={styles.note}>
            Please Note: If you joined sometime during the year and paid for a year&apos;s membership, your following
            year&apos;s dues will be prorated.
          </p>
        </div>
      </SectionCard>

      <EruvSupportPrompt />

      <SectionCard>
        <div className={styles.storyGrid}>
          <div className={styles.storyCopy}>
            <h2 className={styles.panelTitle}>Why Join?</h2>
            <p className={styles.bodyText}>
              We try to make everyone, member &amp; nonmember alike, feel welcome in our community. Visitors to our shul
              speak glowingly about the way we assist them in so many ways. But our shul can&apos;t live on love alone!
              Mekor Habracha cannot exist and provide so many services without paying members and the generosity of donors.
              The Center City Jewish life that you enjoy depends on Mekor Habracha, and Mekor Habracha depends on membership
              dues. When you join, you become part of a shul community which will always feel great devotion to its loyal
              members.
            </p>
          </div>
          <div className={styles.imageFrame}>
            <Image
              src={MEMBERSHIP_IMAGES.community}
              alt="Mekor Habracha community members"
              fill
              sizes="(max-width: 900px) 100vw, 460px"
              className={styles.coverImage}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Benefits of Membership">
        <div className={styles.benefitsLayout}>
          <div className={styles.benefitColumns}>
            <article className={styles.benefitCard}>
              <p className={styles.benefitIntro}>
                Here&apos;s just a partial list of how Mekor contributes to your Center City Jewish community:
              </p>
              <ul className={styles.bulletList}>
                {COMMUNITY_BENEFITS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.benefitCard}>
              <p className={styles.benefitIntro}>And here&apos;s a partial list of special member benefits:</p>
              <ul className={styles.bulletList}>
                {MEMBER_BENEFITS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className={styles.sideImageFrame}>
            <Image
              src={MEMBERSHIP_IMAGES.benefits}
              alt="Mekor Habracha membership community moments"
              fill
              sizes="(max-width: 900px) 100vw, 400px"
              className={styles.coverImage}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard className={styles.joinCard}>
        <div className={styles.joinGrid}>
          <div className={styles.joinCopy}>
            <h2 className={styles.panelTitle}>How to Join or Renew</h2>
            <p className={styles.bodyText}>We offer 2 simple ways to join or renew:</p>
            <p className={styles.bodyText}>
              Use <Link href={MEMBERSHIP_FORM_URL}>this form</Link> OR Email{" "}
              <a href="mailto:admin@mekorhabracha.org?subject=Membership%20Question">admin@mekorhabracha.org</a>.
            </p>
            <p className={styles.bodyText}>
              Tell us if you&apos;re renewing or joining for the first time, and please specify the type of membership and
              method of payment you will use (Venmo, Paypal, personal check, etc.)
            </p>
            <div className={styles.actionRow}>
              <Link href={MEMBERSHIP_FORM_URL} className={styles.actionButton}>
                Join Now!
              </Link>
              <a href="mailto:admin@mekorhabracha.org?subject=Membership%20Question" className={styles.actionButtonSecondary}>
                Email admin@mekorhabracha.org
              </a>
            </div>
          </div>

          <div className={styles.joinSidebar}>
            <div className={styles.joinImageFrame}>
              <Image
                src={MEMBERSHIP_IMAGES.join}
                alt="Mekor Habracha members at synagogue"
                fill
                sizes="(max-width: 900px) 100vw, 420px"
                className={styles.coverImage}
              />
            </div>
            <div className={styles.supportPanel}>
              <p className={styles.supportText}>
                Please note that we never turn anyone away for lack of funds. If you would like to request a payment plan
                or reduction to fit your budget, please email the shul or call{" "}
                <a href="tel:+12155254246">(215) 525-4246</a>, or contact a Board member or Rabbi Hirsch. All requests will
                remain confidential.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard className={styles.auxiliaryCard}>
        <div className={styles.auxiliaryGrid}>
          <div className={styles.auxiliaryCopy}>
            <h2 className={styles.panelTitle}>Auxiliary Membership</h2>
            <p className={styles.leadText}>
              Auxiliary Membership rates are available for those living outside Center City Philadelphia.
            </p>
            <p className={styles.bodyText}>
              Please <Link href="/auxiliary-membership">CLICK HERE</Link> for info.
            </p>
            <div className={styles.actionRow}>
              <Link href="/auxiliary-membership" className={styles.actionButton}>
                CLICK HERE for info
              </Link>
              <a
                href="mailto:admin@mekorhabracha.org?subject=Auxiliary%20Membership"
                className={styles.actionButtonSecondary}
              >
                Email admin@mekorhabracha.org
              </a>
            </div>
          </div>

          <aside className={styles.auxiliaryAside}>
            <p className={styles.sectionEyebrow}>Auxiliary rates</p>
            <div className={styles.auxiliaryRateGrid}>
              {AUXILIARY_MEMBERSHIP_RATES.map(([label, amount]) => (
                <article className={styles.auxiliaryRateCard} key={label}>
                  <p className={styles.rateTitle}>{label}</p>
                  <p className={styles.rateAmount}>{amount}</p>
                </article>
              ))}
            </div>
            <p className={styles.asideNote}>Auxiliary membership does not include High Holiday seats.</p>
          </aside>
        </div>
      </SectionCard>

      <SectionCard title="Contact Us">
        <CTACluster
          items={[
            { label: "Call", href: "tel:+12155254246" },
            { label: "Email", href: "mailto:admin@mekorhabracha.org?subject=Join%20Us" },
            {
              label: "Open map",
              href: "https://maps.google.com/?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102",
              description: "Mekor Habracha Center City Synagogue, 1500 Walnut St Suite 206, Philadelphia, PA 19102",
            },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
