import type { Metadata } from "next";

import { InTheNewsDirectory } from "@/components/in-the-news/in-the-news-directory";
import { NativeShell } from "@/components/navigation/native-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getManagedInTheNews } from "@/lib/in-the-news/store";

export const metadata: Metadata = {
  title: "In The News | Mekor Habracha",
  description:
    "Browse press coverage and feature stories about Mekor Habracha with searchable, filterable archive controls.",
};

export const dynamic = "force-dynamic";

function buildFeaturedByline(publishedLabel: string, author: string) {
  const normalizedPublished = publishedLabel.trim();
  const normalizedAuthor = author.trim();

  if (!normalizedPublished) {
    return normalizedAuthor;
  }

  if (!normalizedAuthor) {
    return normalizedPublished;
  }

  if (normalizedPublished.toLowerCase().includes(normalizedAuthor.toLowerCase())) {
    return normalizedPublished;
  }

  return `${normalizedPublished} • ${normalizedAuthor}`;
}

export default async function InTheNewsPage() {
  const articles = await getManagedInTheNews();
  const featured = articles[0] ?? null;

  return (
    <NativeShell currentPath="/in-the-news" className="in-news-page" contentClassName="in-news gap-6">
      <Card className="overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:items-end">
          <div className="space-y-4">
            <Badge>Press Mentions</Badge>
            <div className="space-y-3">
              <h1 className="font-[family-name:var(--font-heading)] text-5xl leading-[0.94] tracking-[-0.04em] text-[var(--color-foreground)] sm:text-6xl">
                In The News
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--color-muted)] sm:text-lg sm:leading-8">
                Search and filter every archived story from our backend directory. Open each article on Mekor or jump to the original source.
              </p>
            </div>
          </div>

          {featured ? (
            <div className="rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(145deg,rgba(35,77,120,0.08),rgba(194,166,122,0.08))] px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Featured</p>
              <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl tracking-[-0.03em] text-[var(--color-foreground)]">
                {featured.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                {buildFeaturedByline(featured.publishedLabel, featured.author)}
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      <InTheNewsDirectory articles={articles} />
    </NativeShell>
  );
}
