"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ManagedInTheNewsArticle } from "@/lib/in-the-news/store";

type InTheNewsDirectoryProps = {
  articles: ManagedInTheNewsArticle[];
};

function normalize(value: string) {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizePublicationLabel(value: string) {
  if (!value) {
    return "Unknown source";
  }

  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPublishedDate(article: ManagedInTheNewsArticle) {
  if (article.publishedLabel) {
    return article.publishedLabel;
  }

  if (!article.publishedAt) {
    return "";
  }

  const date = new Date(article.publishedAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function buildByline(article: ManagedInTheNewsArticle) {
  const published = formatPublishedDate(article);
  const author = article.author.trim();

  if (!published) {
    return author;
  }

  if (!author) {
    return published;
  }

  if (published.toLowerCase().includes(author.toLowerCase())) {
    return published;
  }

  return `${published} • ${author}`;
}

export function InTheNewsDirectory({ articles }: InTheNewsDirectoryProps) {
  const [search, setSearch] = useState("");
  const [selectedPublication, setSelectedPublication] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  const publicationOptions = useMemo(() => {
    const publications = new Map<string, string>();

    for (const article of articles) {
      const normalizedPublication = normalize(article.publication);
      if (!normalizedPublication) continue;
      if (publications.has(normalizedPublication)) continue;
      publications.set(
        normalizedPublication,
        normalizePublicationLabel(article.publication),
      );
    }

    return [
      { value: "all", label: "All Publications" },
      ...[...publications.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [articles]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();

    for (const article of articles) {
      if (article.year) {
        years.add(article.year);
      }
    }

    return ["all", ...[...years].sort((a, b) => b - a).map(String)];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const searchTerm = normalize(search);
    const publicationFilter = normalize(selectedPublication);

    return articles.filter((article) => {
      if (selectedYear !== "all" && String(article.year ?? "") !== selectedYear) {
        return false;
      }

      if (
        publicationFilter !== "all" &&
        normalize(article.publication) !== publicationFilter
      ) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const haystack = [
        article.title,
        article.excerpt,
        article.bodyText,
        article.author,
        article.publication,
        article.publishedLabel,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchTerm);
    });
  }, [articles, search, selectedPublication, selectedYear]);

  return (
    <section className="in-news-directory" aria-label="In the news directory">
      <div className="in-news-directory__controls">
        <label className="in-news-directory__control">
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, author, publication, excerpt"
          />
        </label>

        <label className="in-news-directory__control">
          <span>Publication</span>
          <select
            value={selectedPublication}
            onChange={(event) => setSelectedPublication(event.target.value)}
          >
            {publicationOptions.map((publication) => (
              <option key={publication.value} value={publication.value}>
                {publication.label}
              </option>
            ))}
          </select>
        </label>

        <label className="in-news-directory__control">
          <span>Year</span>
          <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year === "all" ? "All Years" : year}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="in-news-directory__count">
        Showing {filteredArticles.length} of {articles.length} articles.
      </p>

      {filteredArticles.length === 0 ? (
        <p className="in-news-directory__empty">
          No articles match your filters. Try broadening the search or choosing a different year.
        </p>
      ) : (
        <div className="in-news-directory__grid">
          {filteredArticles.map((article) => {
            const hasInternalPage = article.path.startsWith("/");

            return (
              <article key={article.path} className="in-news-directory__card">
                <div className="in-news-directory__meta">
                  <span className="in-news-directory__publication">
                    {normalizePublicationLabel(article.publication)}
                  </span>
                  {article.year ? <span>{article.year}</span> : null}
                </div>

                <h3>{article.title}</h3>

                {article.author || article.publishedAt || article.publishedLabel ? (
                  <p className="in-news-directory__byline">
                    {buildByline(article)}
                  </p>
                ) : null}

                {article.excerpt ? <p className="in-news-directory__excerpt">{article.excerpt}</p> : null}

                <div className="in-news-directory__links">
                  {hasInternalPage ? <Link href={article.path}>Read on Mekor</Link> : null}
                  {article.sourceUrl ? (
                    <a href={article.sourceUrl} target="_blank" rel="noreferrer noopener">
                      {hasInternalPage ? "Original Source" : "Read Article"}
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
