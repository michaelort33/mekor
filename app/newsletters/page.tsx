import type { Metadata } from "next";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { NewsletterArchive } from "@/components/newsletters/newsletter-archive";
import { getNewsletterSummaries } from "@/lib/newsletters/data";
import styles from "./page.module.css";

const PATH = "/newsletters";

export const metadata: Metadata = {
  title: "Past Newsletters | Mekor Habracha",
  description:
    "Search and read Mekor Habracha weekly newsletters, community announcements, classes, events, and eruv updates in our complete local archive.",
};

export default function NewslettersPage() {
  const newsletters = getNewsletterSummaries();

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.content}>
      <header className={styles.intro}>
        <h1 className={styles.pageTitle}>Past Newsletters</h1>
        <p className={styles.lead}>
          Weekly news, community announcements, classes, events, and eruv updates — preserved here in full.
        </p>
      </header>

      <NewsletterArchive newsletters={newsletters} />

      <MarketingFooter newsletterSourcePath={PATH} />
    </MarketingPageShell>
  );
}
