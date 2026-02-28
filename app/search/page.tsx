import type { Metadata } from "next";
import Link from "next/link";

import { loadSearchIndex } from "@/lib/mirror/loaders";
import { SiteNavigation } from "@/components/navigation/site-navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search | Mekor Habracha",
  description: "Search public content mirrored from mekorhabracha.org.",
};

type SearchProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeQuery(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
}

function cleanExcerpt(input: string) {
  return input
    .replace(/Skip to Main Content/gi, "")
    .replace(/Membership\s+Events\s+Donate\s+Kiddush\s+Center City Beit Midrash/gi, "")
    .replace(/Join Us\s+Davening\s+Who We Are\s+Kosher Restaurants\s+More\s+Support Mekor/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function SearchPage({ searchParams }: SearchProps) {
  const params = await searchParams;
  const queryRaw = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const query = normalizeQuery(queryRaw);

  const records = await loadSearchIndex();
  const queryTerms = query.split(/\s+/).filter(Boolean);

  const results =
    queryTerms.length === 0
      ? []
      : records
          .map((record) => {
            const score = queryTerms.reduce((acc, term) => {
              if (record.terms.includes(term)) {
                return acc + 3;
              }
              if (record.title.toLowerCase().includes(term)) {
                return acc + 2;
              }
              if (record.excerpt.toLowerCase().includes(term)) {
                return acc + 1;
              }
              return acc;
            }, 0);

            return { record, score };
          })
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score || a.record.path.localeCompare(b.record.path))
          .slice(0, 60);

  return (
    <main className="search-page" data-native-nav="true">
      <SiteNavigation currentPath="/search" />
      <section className="search-root">
        <h1>Search</h1>
        {queryTerms.length === 0 ? (
          <p>
            Provide a search term with <code>?q=...</code>.
          </p>
        ) : null}
        {queryTerms.length > 0 && results.length === 0 ? <p>No results found.</p> : null}
        {results.length > 0 ? (
          <ul>
            {results.map(({ record }) => (
              <li key={record.path}>
                <Link href={record.path}>{record.title || record.path}</Link>
                <p>{cleanExcerpt(record.excerpt)}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
