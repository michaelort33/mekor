import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { getHebrewYearContext } from "@/lib/calendar/hebrew-year";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/membership" as const;
const MEMBERSHIP_FORM_URL = "/membership/apply";

const MEMBERSHIP_IMAGES = {
  hero:
    "https://static.wixstatic.com/media/11062b_6ef3ee78b5784e3586f8a9366c89f5ee~mv2.jpeg",
  community:
    "https://static.wixstatic.com/media/92f487_1b9e6a717396499c912c95ed541884b4~mv2.jpg",
  benefits:
    "https://static.wixstatic.com/media/92f487_e06bca9eef7844c4b8dbaef89fa60417~mv2.jpeg",
  join:
    "https://static.wixstatic.com/media/92f487_1b9e6a717396499c912c95ed541884b4~mv2.jpg",
} as const;

const MEMBERSHIP_RATE_ROWS = [
  ["Single Membership", "$1000"],
  ["Couple/Family Membership", "$2,000"],
  ["Student Membership", "$500"],
] as const;

const AUXILIARY_MEMBERSHIP_RATES = [
  ["Family / Couple", "$900"],
  ["Single Adult", "$450"],
  ["Single Student", "$225"],
] as const;

const COMMUNITY_BENEFITS = [
  "A warm, inviting community that welcomes people of all ages and levels of observance.",
  "Shabbat, holiday, and weekday services for you and your visiting family, in a beautiful, handicapped accessible space in the heart of Center City.",
  "Shabbat and Yom Tov Kiddushim.",
  "Community Shabbat and Yom Tov meals.",
  "Special programming and holiday festivities for both children and adults.",
  "Torah study and classes at all levels, from beginner to advanced.",
  "Halachic, spiritual, and life guidance.",
  "A plethora of Kosher eateries under responsible supervision.",
  "A fully functioning Eruv that covers all of Center City and adjoining neighborhoods.",
  "And the countless other ways Mekor Habracha enriches Jewish life in Center City and beyond!",
] as const;

const MEMBER_BENEFITS = [
  "Free High Holiday seats and discounted guest rates.",
  "Meaningful Jewish-oriented children's programming.",
  "Community-wide announcements of life cycle events.",
  "A warm, caring community to celebrate your joyful occasions and support you during difficult times.",
  "Mekor's meal train to help during those events.",
  "For life cycle ceremonies and celebrations, use of shul at no charge, conditions apply.",
  "Discounts on Kiddush sponsorships and private event rentals.",
  "Discounts on certain special programs and meals.",
  "Invitation to Annual Mekor Habracha Meeting.",
  "Classes to assist potential converts become productive members of the Jewish community.",
  "And much, much more.",
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
        title="Join Mekor Habracha"
        subtitle="Membership in Mekor Habracha"
        variant="quiet"
        image={{
          src: MEMBERSHIP_IMAGES.hero,
          alt: "Mekor Habracha community gathering",
          objectFit: "cover",
          objectPosition: "50% 44%",
        }}
        description={[
          "We offer 2 simple ways to join or renew.",
          "Choose from annual membership options below or connect directly by email for payment support.",
        ]}
        actions={[
          { label: "Apply for membership", href: MEMBERSHIP_FORM_URL },
          { label: "Email membership team", href: "mailto:mekorhabracha@gmail.com?subject=Membership%20Question" },
        ]}
      />

      <SectionCard className={styles.overviewCard}>
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCopy}>
            <p className={styles.sectionEyebrow}>Join or renew</p>
            <h2 className={styles.panelTitle}>We offer 2 simple ways to join or renew:</h2>
            <p className={styles.leadText}>
              We try to make everyone, member and nonmember alike, feel welcome in our community. Visitors to our shul
              speak glowingly about the way we assist them in so many ways.
            </p>
            <p className={styles.bodyText}>
              Mekor Habracha cannot exist and provide so many services without paying members and the generosity of
              donors. The Center City Jewish life that you enjoy depends on Mekor Habracha, and Mekor Habracha depends
              on membership dues. When you join, you become part of a shul community which will always feel great
              devotion to its loyal members.
            </p>
          </div>

          <aside className={styles.overviewAside}>
            <p className={styles.sectionEyebrow}>At a glance</p>
            <ul className={styles.factList}>
              <li>Choose one of the membership options below.</li>
              <li>Email the shul directly if you prefer to join or renew via email.</li>
              <li>Auxiliary membership available outside Center City.</li>
              <li>No one is turned away for lack of funds.</li>
            </ul>
            <p className={styles.asideNote}>
              Auxiliary Membership rates are available for those living outside Center City Philadelphia. <Link href="/auxiliary-membership">Please click here for info</Link>.
            </p>
          </aside>
        </div>
      </SectionCard>

      <SectionCard className={styles.auxiliaryCard}>
        <div className={styles.auxiliaryGrid}>
          <div className={styles.auxiliaryCopy}>
            <p className={styles.sectionEyebrow}>Outside Center City?</p>
            <h2 className={styles.panelTitle}>Auxiliary membership is a real join option.</h2>
            <p className={styles.leadText}>
              If you live outside Center City Philadelphia, auxiliary membership may be the right fit. It is intended
              for alumni and others outside the Philadelphia region who want to stay connected to Mekor in a meaningful
              way.
            </p>
            <p className={styles.bodyText}>
              This should not feel like a hidden alternative. Review the auxiliary membership details, rates, and
              request form on the dedicated page.
            </p>
            <div className={styles.actionRow}>
              <Link href="/auxiliary-membership" className={styles.actionButton}>
                View auxiliary membership
              </Link>
              <a
                href="mailto:admin@mekorhabracha.org?subject=Auxiliary%20Membership"
                className={styles.actionButtonSecondary}
              >
                Email about auxiliary membership
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

      <SectionCard title="Membership Categories & Rates">
        <p className={styles.intro}>
          Year {hebrewYear.currentHebrewYearLabel} ({hebrewYear.currentCivilSpanLabel}) membership rates for new and
          renewing members:
        </p>
        <div className={styles.rateGrid}>
          {MEMBERSHIP_RATE_ROWS.map(([label, amount]) => (
            <article className={styles.rateCard} key={label}>
              <p className={styles.rateTitle}>{label}</p>
              <p className={styles.rateAmount}>{amount}</p>
              <p className={styles.rateTerm}>Until Rosh Hashana {hebrewYear.nextRoshHashanaHebrewYearLabel}</p>
              <Link href={MEMBERSHIP_FORM_URL} className={styles.inlineAction}>
                Join now
              </Link>
            </article>
          ))}
        </div>
        <div className={styles.noteStack}>
          <p className={styles.note}>We also request a suggested donation of <strong>$100</strong> as a security fee.</p>
          <p className={styles.note}>If you joined during the year and paid for a full year, your following year&apos;s dues will be prorated.</p>
        </div>
      </SectionCard>

      <SectionCard>
        <div className={styles.storyGrid}>
          <div className={styles.storyCopy}>
            <p className={styles.sectionEyebrow}>Why join</p>
            <h2 className={styles.panelTitle}>Why Join?</h2>
            <p className={styles.bodyText}>
              We try to make everyone, member &amp; nonmember alike, feel welcome in our community. Visitors to our
              shul speak glowingly about the way we assist them in so many ways.
            </p>
            <p className={styles.bodyText}>
              But our shul can&apos;t live on love alone. Mekor Habracha cannot exist and provide so many services
              without paying members and the generosity of donors. The Center City Jewish life that you enjoy depends on
              Mekor Habracha, and Mekor Habracha depends on membership dues.
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
              <p className={styles.sectionEyebrow}>Community life</p>
              <ul className={styles.bulletList}>
                {COMMUNITY_BENEFITS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.benefitCard}>
              <p className={styles.sectionEyebrow}>Member extras</p>
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
            <p className={styles.sectionEyebrow}>How to join or renew</p>
            <h2 className={styles.panelTitle}>How to Join or Renew</h2>
            <p className={styles.bodyText}>
              Use our form or email us directly. Please tell us if you are renewing or joining for the first time and
              include your preferred membership type and payment method such as Venmo, PayPal, or personal check.
            </p>
            <ul className={styles.checkList}>
              <li>Tell us whether you are joining for the first time or renewing.</li>
              <li>Include your preferred membership type.</li>
              <li>Let us know your preferred payment method.</li>
              <li>Reach out directly if you need a payment plan or reduction.</li>
            </ul>
            <div className={styles.actionRow}>
              <Link href={MEMBERSHIP_FORM_URL} className={styles.actionButton}>
                Apply for membership
              </Link>
              <a href="mailto:mekorhabracha@gmail.com?subject=Membership%20Question" className={styles.actionButtonSecondary}>
                Email us
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
              <p className={styles.sectionEyebrow}>Support available</p>
              <p className={styles.supportText}>
                We never turn anyone away for lack of funds. If you need a payment plan or reduction, call <a href="tel:+12155254246">(215) 525-4246</a> or email the shul.
              </p>
            </div>
          </div>
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
