import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3 } from "lucide-react";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { NewsletterArticle } from "@/components/newsletters/newsletter-article";
import {
  formatNewsletterDate,
  getAdjacentNewsletters,
  getNewsletterBySlug,
  NEWSLETTER_CATEGORY_LABELS,
  NEWSLETTERS,
} from "@/lib/newsletters/data";
import styles from "./page.module.css";

const PATH = "/newsletters";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return NEWSLETTERS.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const newsletter = getNewsletterBySlug(slug);
  if (!newsletter) return { title: "Newsletter | Mekor Habracha" };
  return {
    title: `${newsletter.title} | Mekor Habracha`,
    description: newsletter.preview,
  };
}

function IssueLink({
  slug,
  title,
  direction,
}: {
  slug: string;
  title: string;
  direction: "newer" | "older";
}) {
  return (
    <Link href={`/newsletters/${slug}`} className={styles.issueLink} data-direction={direction}>
      {direction === "newer" ? <ArrowLeft aria-hidden="true" /> : null}
      <span>
        <small>{direction === "newer" ? "Newer issue" : "Older issue"}</small>
        <strong>{title}</strong>
      </span>
      {direction === "older" ? <ArrowRight aria-hidden="true" /> : null}
    </Link>
  );
}

export default async function NewsletterPage({ params }: PageProps) {
  const { slug } = await params;
  const newsletter = getNewsletterBySlug(slug);
  if (!newsletter) notFound();
  const { newer, older } = getAdjacentNewsletters(slug);

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.content}>
      <div className={styles.utilityBar}>
        <Link href={PATH} className={styles.allIssues}>
          <ArrowLeft aria-hidden="true" />
          All newsletters
        </Link>
        <div className={styles.utilityMeta}>
          <span>{NEWSLETTER_CATEGORY_LABELS[newsletter.category]}</span>
          <span>
            <CalendarDays aria-hidden="true" />
            {formatNewsletterDate(newsletter.sentOn)}
          </span>
          <span>
            <Clock3 aria-hidden="true" />
            {newsletter.readingMinutes} min read
          </span>
        </div>
      </div>

      {newsletter.toc.length ? (
        <details className={styles.mobileContents}>
          <summary>On this page</summary>
          <nav aria-label="Newsletter contents">
            {newsletter.toc.map((item) => (
              <a href={`#${item.id}`} key={item.id}>
                {item.label}
              </a>
            ))}
          </nav>
        </details>
      ) : null}

      <div className={styles.readerLayout}>
        {newsletter.toc.length ? (
          <aside className={styles.contentsRail}>
            <p>On this page</p>
            <nav aria-label="Newsletter contents">
              {newsletter.toc.map((item) => (
                <a href={`#${item.id}`} data-level={item.level} key={item.id}>
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
        ) : null}
        <NewsletterArticle newsletter={newsletter} />
      </div>

      <nav className={styles.issueNavigation} aria-label="Browse newsletter issues">
        {newer ? <IssueLink slug={newer.slug} title={newer.title} direction="newer" /> : <span />}
        {older ? <IssueLink slug={older.slug} title={older.title} direction="older" /> : <span />}
      </nav>

      <MarketingFooter newsletterSourcePath={PATH} />
    </MarketingPageShell>
  );
}
