import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import {
  BOARD_IMAGES,
  BOARD_NAV,
  COMMUNITY_ANNOUNCEMENTS,
  COMMUNITY_UPDATES,
  ERUV_DONATION_LINK,
  FEATURED_NOW,
  PATH,
  STANDING_INFO,
  type BulletinCard,
} from "./content";
import styles from "./page.module.css";

function isHttpLink(href: string) {
  return /^https?:\/\//i.test(href);
}

function BoardLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      target={isHttpLink(href) ? "_blank" : undefined}
      rel={isHttpLink(href) ? "noreferrer noopener" : undefined}
    >
      {children}
      {isHttpLink(href) ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}

function CardLinks({ item }: { item: BulletinCard }) {
  if (!item.links.length) return null;
  return (
    <div className={styles.cardLinks}>
      {item.links.map((link) => (
        <BoardLink key={`${item.title}-${link.href}`} href={link.href} className={styles.cardLink}>
          {link.label}
        </BoardLink>
      ))}
    </div>
  );
}

function FeaturedCard({ item }: { item: BulletinCard }) {
  const flyer = item.image?.aspect === "flyer";
  return (
    <article className={`${styles.featuredCard} ${flyer ? styles.featuredFlyer : styles.featuredWide}`}>
      {item.image ? (
        <div className={styles.featuredMedia}>
          <Image
            src={item.image.src}
            alt={item.image.alt}
            fill
            sizes={flyer ? "(max-width: 1024px) 90vw, 360px" : "(max-width: 1024px) 100vw, 640px"}
            className={flyer ? styles.flyerImage : styles.featuredImage}
            loading="lazy"
          />
        </div>
      ) : null}
      <div className={styles.featuredBody}>
        <h3>{item.title}</h3>
        {item.paragraphs.map((paragraph, index) => (
          <p key={`${item.title}-${index}`}>{paragraph}</p>
        ))}
        <CardLinks item={item} />
      </div>
    </article>
  );
}

function StandingCard({ item }: { item: BulletinCard }) {
  return (
    <article className={styles.standingCard}>
      {item.image ? (
        <div className={styles.standingMedia}>
          <Image
            src={item.image.src}
            alt={item.image.alt}
            width={720}
            height={220}
            sizes="(max-width: 760px) 100vw, 360px"
            className={styles.standingImage}
            loading="lazy"
          />
        </div>
      ) : null}
      <div className={styles.standingBody}>
        <h3>{item.title}</h3>
        {item.paragraphs.map((paragraph, index) => (
          <p key={`${item.title}-${index}`}>{paragraph}</p>
        ))}
        <CardLinks item={item} />
      </div>
    </article>
  );
}

function PinCard({ item }: { item: BulletinCard }) {
  return (
    <article className={`${styles.pinCard} ${item.tone === "urgent" ? styles.pinUrgent : ""}`}>
      <h3>{item.title}</h3>
      {item.paragraphs.map((paragraph, index) => (
        <p key={`${item.title}-${index}`}>{paragraph}</p>
      ))}
      <CardLinks item={item} />
    </article>
  );
}

function ClassifiedRow({ item }: { item: BulletinCard }) {
  return (
    <article className={styles.classifiedRow}>
      <div className={styles.classifiedCopy}>
        <h3>{item.title}</h3>
        {item.paragraphs.map((paragraph, index) => (
          <p key={`${item.title}-${index}`}>{paragraph}</p>
        ))}
      </div>
      <CardLinks item={item} />
    </article>
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
      <header id="board-top" className={styles.hero}>
        <div className={styles.heroMedia} aria-hidden="true">
          <Image
            src={BOARD_IMAGES.hero}
            alt=""
            fill
            priority
            sizes="100vw"
            className={styles.heroImage}
          />
          <div className={styles.heroShade} />
        </div>
        <div className={styles.heroInner}>
          <h1>Mekor Bulletin Board</h1>
          <p className={styles.heroLead}>
            Classes, campaigns, volunteer opportunities, and neighborly offers — posted in one place and kept up to
            date.
          </p>
          <nav className={styles.chipNav} aria-label="Bulletin board sections">
            {BOARD_NAV.map((item) => (
              <a key={item.href} href={item.href} className={styles.chip}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {FEATURED_NOW.length > 0 ? (
        <section className={styles.boardSection} aria-labelledby="featured-now-title">
          <div id="featured-now" className={styles.anchor} />
          <div className={styles.sectionHeading}>
            <h2 id="featured-now-title">Featured Now</h2>
            <p>This season&apos;s campaigns and classes, happening right now.</p>
          </div>
          <div className={styles.featuredGrid}>
            {FEATURED_NOW.map((item) => (
              <FeaturedCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.boardSection} aria-labelledby="standing-info-title">
        <div id="standing-info" className={styles.anchor} />
        <div className={styles.sectionHeading}>
          <h2 id="standing-info-title">Community Essentials</h2>
          <p>The programs, contacts, and resources you&apos;ll come back to all year.</p>
        </div>
        <div className={styles.standingGrid}>
          {STANDING_INFO.map((item) => (
            <StandingCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className={styles.boardSection} aria-labelledby="community-updates-title">
        <div id="community-updates" className={styles.anchor} />
        <div className={styles.sectionHeading}>
          <h2 id="community-updates-title">Community Updates</h2>
          <p>Current opportunities and notices from Mekor.</p>
        </div>
        <div className={styles.pinGrid}>
          {COMMUNITY_UPDATES.map((item) => (
            <PinCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className={styles.boardSection} aria-labelledby="community-announcements-title">
        <div id="community-announcements" className={styles.anchor} />
        <div className={styles.sectionHeading}>
          <h2 id="community-announcements-title">Jewish Community Events and Announcements</h2>
          <p>Useful local notices shared with the Mekor community.</p>
        </div>
        <div className={styles.classifiedList}>
          {COMMUNITY_ANNOUNCEMENTS.map((item) => (
            <ClassifiedRow key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className={styles.boardSection} aria-labelledby="support-mekor-title">
        <div id="support-mekor" className={styles.anchor} />
        <div className={styles.sectionHeading}>
          <h2 id="support-mekor-title">Support Mekor</h2>
        </div>
        <div className={styles.supportPanel}>
          <div className={styles.supportActions}>
            <BoardLink href="/donations" className={styles.supportPrimary}>
              Donate to Mekor
            </BoardLink>
            <BoardLink href={ERUV_DONATION_LINK} className={styles.supportPrimary}>
              Donate to the Center City Eruv
            </BoardLink>
          </div>
          <p className={styles.supportLead}>
            If you use the following Mekor-specific links when ordering from Kosherwine.com and Judaica.com, Mekor will
            earn 5% back!
          </p>
          <div className={styles.supportActions}>
            <BoardLink href="https://tinyurl.com/mekorwine" className={styles.supportSecondary}>
              Kosherwine.com via Mekor Link
            </BoardLink>
            <BoardLink href="https://tinyurl.com/mekorjudaica" className={styles.supportSecondary}>
              Judaica.com via Mekor Link
            </BoardLink>
          </div>
        </div>
      </section>

      <section className={styles.boardSection} aria-labelledby="quick-contacts-title">
        <div className={styles.sectionHeading}>
          <h2 id="quick-contacts-title">Quick Contacts and Links</h2>
        </div>
        <div className={styles.contactStrip}>
          <BoardLink href="mailto:mekorhabracha@gmail.com" className={styles.contactChip}>
            General Shul Email
          </BoardLink>
          <BoardLink href="tel:+12155254246" className={styles.contactChip}>
            Call the Office: (215) 525-4246
          </BoardLink>
          <BoardLink href="https://philamikvah.org/" className={styles.contactChip}>
            Mikvah Website
          </BoardLink>
          <BoardLink href="/newsletters" className={styles.contactChip}>
            Past Newsletters
          </BoardLink>
        </div>
        <p className={styles.backToTop}>
          <a href="#board-top">Back to top ↑</a>
        </p>
      </section>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
