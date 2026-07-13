"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Filter, RotateCcw, Search, X } from "lucide-react";

import {
  formatNewsletterDate,
  NEWSLETTER_CATEGORY_LABELS,
  type NewsletterCategory,
  type NewsletterSummary,
} from "@/lib/newsletters/model";
import styles from "@/app/newsletters/page.module.css";

const ALL_CATEGORIES = Object.keys(NEWSLETTER_CATEGORY_LABELS) as NewsletterCategory[];

function CategoryLabel({ category }: { category: NewsletterCategory }) {
  return (
    <span className={styles.category} data-category={category}>
      {NEWSLETTER_CATEGORY_LABELS[category]}
    </span>
  );
}

export function NewsletterArchive({ newsletters }: { newsletters: NewsletterSummary[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<NewsletterCategory | "all">("all");
  const [year, setYear] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const years = useMemo(
    () => [...new Set(newsletters.map((item) => item.sentOn.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [newsletters],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      newsletters.filter((item) => {
        if (category !== "all" && item.category !== category) return false;
        if (year !== "all" && !item.sentOn.startsWith(year)) return false;
        if (!normalizedQuery) return true;
        return `${item.title} ${item.preview} ${item.searchText}`.toLowerCase().includes(normalizedQuery);
      }),
    [category, newsletters, normalizedQuery, year],
  );

  const [featured, ...archive] = filtered;
  const hasFilters = category !== "all" || year !== "all";

  function clearFilters() {
    setCategory("all");
    setYear("all");
  }

  return (
    <div className={styles.archiveExperience}>
      <section className={styles.searchSection} aria-label="Search and filter newsletters">
        <div className={styles.searchRow}>
          <label className={styles.searchField}>
            <Search aria-hidden="true" />
            <span className="sr-only">Search every issue</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search every issue"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                <X aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <button
            type="button"
            className={styles.filterTrigger}
            aria-expanded={filtersOpen}
            aria-controls="newsletter-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter aria-hidden="true" />
            Filters
            {hasFilters ? (
              <span className={styles.filterCount}>{Number(category !== "all") + Number(year !== "all")}</span>
            ) : null}
          </button>
        </div>

        {filtersOpen ? (
          <div className={styles.filterPanel} id="newsletter-filters">
            <div className={styles.filterGroup}>
              <p>Issue type</p>
              <div className={styles.filterOptions} role="group" aria-label="Issue type">
                <button
                  type="button"
                  className={category === "all" ? styles.filterSelected : undefined}
                  onClick={() => setCategory("all")}
                >
                  All issues
                </button>
                {ALL_CATEGORIES.map((item) => (
                  <button
                    type="button"
                    className={category === item ? styles.filterSelected : undefined}
                    onClick={() => setCategory(item)}
                    key={item}
                  >
                    {NEWSLETTER_CATEGORY_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
            <label className={styles.yearFilter}>
              <span>Year</span>
              <select value={year} onChange={(event) => setYear(event.target.value)}>
                <option value="all">All years</option>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={styles.resetFilters} onClick={clearFilters} disabled={!hasFilters}>
              <RotateCcw aria-hidden="true" />
              Clear filters
            </button>
          </div>
        ) : null}

        {hasFilters ? (
          <div className={styles.activeFilters} aria-label="Active filters">
            {category !== "all" ? (
              <button type="button" onClick={() => setCategory("all")}>
                {NEWSLETTER_CATEGORY_LABELS[category]}
                <X aria-hidden="true" />
              </button>
            ) : null}
            {year !== "all" ? (
              <button type="button" onClick={() => setYear("all")}>
                {year}
                <X aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {featured ? (
        <>
          <Link href={`/newsletters/${featured.slug}`} className={styles.featuredIssue}>
            <div className={styles.featuredAccent} aria-hidden="true" />
            <div className={styles.featuredBody}>
              <div className={styles.featuredMeta}>
                <span>Latest matching issue</span>
                <CategoryLabel category={featured.category} />
              </div>
              <h2>{featured.title}</h2>
              <p>{featured.preview}</p>
              <div className={styles.issueMeta}>
                <CalendarDays aria-hidden="true" />
                <time dateTime={featured.sentOn}>{formatNewsletterDate(featured.sentOn)}</time>
                <span aria-hidden="true">·</span>
                <span>{featured.readingMinutes} min read</span>
              </div>
            </div>
            {featured.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featured.coverImage} alt="" className={styles.featuredImage} />
            ) : null}
            <ArrowRight className={styles.featuredArrow} aria-hidden="true" />
          </Link>

          <div className={styles.resultsHeader} aria-live="polite">
            <p>
              {filtered.length} {filtered.length === 1 ? "issue" : "issues"} found
            </p>
            <p>Newest first</p>
          </div>

          {archive.length ? (
            <ol className={styles.issueList}>
              {archive.map((item) => (
                <li key={item.slug}>
                  <Link href={`/newsletters/${item.slug}`} className={styles.issueRow}>
                    <div className={styles.issueDate}>
                      <time dateTime={item.sentOn}>{formatNewsletterDate(item.sentOn, "short")}</time>
                    </div>
                    <div className={styles.issueSummary}>
                      <div className={styles.issueTitleLine}>
                        <h3>{item.title}</h3>
                        <CategoryLabel category={item.category} />
                      </div>
                      <p>{item.preview}</p>
                    </div>
                    <ArrowRight className={styles.issueArrow} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : (
        <section className={styles.emptyState} aria-live="polite">
          <Search aria-hidden="true" />
          <h2>No newsletters found</h2>
          <p>Try a different search term or clear your filters.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              clearFilters();
            }}
          >
            Reset archive
          </button>
        </section>
      )}
    </div>
  );
}
