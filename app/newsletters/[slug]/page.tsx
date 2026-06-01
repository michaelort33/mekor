import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { NewsletterArticle } from "@/components/newsletters/newsletter-article";
import { NEWSLETTERS, getNewsletterBySlug } from "@/lib/newsletters/data";
import styles from "../page.module.css";

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
  if (!newsletter) {
    return { title: "Newsletter | Mekor Habracha" };
  }
  return {
    title: `${newsletter.parsha} — ${newsletter.dateRange} | Mekor Habracha`,
    description: `Mekor Habracha weekly newsletter for ${newsletter.parsha} (${newsletter.dateRange}).`,
  };
}

export default async function NewsletterPage({ params }: PageProps) {
  const { slug } = await params;
  const newsletter = getNewsletterBySlug(slug);

  if (!newsletter) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page}>
      <div className={styles.back}>
        <Link href={PATH}>← All newsletters</Link>
      </div>
      <section className={styles.featured}>
        <NewsletterArticle newsletter={newsletter} />
      </section>
      <MarketingFooter newsletterSourcePath={PATH} />
    </MarketingPageShell>
  );
}
