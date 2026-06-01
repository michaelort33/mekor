import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { NewsletterArticle } from "@/components/newsletters/newsletter-article";
import { getNewslettersByDate } from "@/lib/newsletters/data";
import styles from "./page.module.css";

const PATH = "/newsletters";

export const metadata: Metadata = {
  title: "Latest News | Mekor Habracha",
  description:
    "Read the latest Mekor Habracha weekly newsletter, with the most recent issue front and center and the full archive of past newsletters.",
};

export default function NewslettersPage() {
  const all = getNewslettersByDate();
  const [latest, ...past] = all;

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Latest News</p>
        <h1 className={styles.pageTitle}>Mekor Habracha Newsletters</h1>
        <p className={styles.lead}>
          Our weekly newsletter — the most recent issue is front and center, with the full archive of past newsletters
          below.
        </p>
      </header>

      {latest ? (
        <section className={styles.featured}>
          <NewsletterArticle newsletter={latest} embedded />
        </section>
      ) : null}

      <section className={styles.archive}>
        <h2 className={styles.archiveTitle}>Past newsletters</h2>
        {past.length ? (
          <ul className={styles.archiveList}>
            {past.map((item) => (
              <li key={item.slug}>
                <Link href={`/newsletters/${item.slug}`} className={styles.archiveItem}>
                  <span className={styles.archiveParsha}>{item.parsha}</span>
                  <span className={styles.archiveDate}>
                    {item.dateRange} · {item.hebrewDate}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.archiveEmpty}>Past issues will appear here as new newsletters are published.</p>
        )}
      </section>

      <MarketingFooter newsletterSourcePath={PATH} />
    </MarketingPageShell>
  );
}
