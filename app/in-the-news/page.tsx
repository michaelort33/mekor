import type { Metadata } from "next";

import { InTheNewsDirectory } from "@/components/in-the-news/in-the-news-directory";
import { NativeShell } from "@/components/navigation/native-shell";
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
    <NativeShell currentPath="/in-the-news" className="in-news-page" contentClassName="in-news">
      <header className="in-news__header">
        <p className="in-news__kicker">Press Mentions</p>
        <h1>In The News</h1>
        <p>
          Search and filter every archived story from our backend directory. Open each article on
          Mekor or jump to the original source.
        </p>

        {featured ? (
          <div className="in-news__featured">
            <span>Featured</span>
            <h2>{featured.title}</h2>
            <p>{buildFeaturedByline(featured.publishedLabel, featured.author)}</p>
          </div>
        ) : null}
      </header>

      <InTheNewsDirectory articles={articles} />
    </NativeShell>
  );
}
