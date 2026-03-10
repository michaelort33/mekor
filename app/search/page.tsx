import type { Metadata } from "next";
import Link from "next/link";

import { NativeShell } from "@/components/navigation/native-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cleanExcerpt, normalizeQuery, searchUniversalDocuments } from "@/lib/search/universal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search | Mekor Habracha",
  description: "Search public content across Mekor Habracha pages, posts, news, and directories.",
};

type SearchProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchProps) {
  const params = await searchParams;
  const queryRaw = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const query = normalizeQuery(queryRaw);
  const queryTerms = query.split(/\s+/).filter(Boolean);
  const results = queryTerms.length === 0 ? [] : await searchUniversalDocuments(queryRaw, 60);

  return (
    <NativeShell currentPath="/search" className="search-page" contentClassName="gap-6">
      <Card className="overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div className="space-y-4">
            <Badge>Search Mekor</Badge>
            <div className="space-y-3">
              <h1 className="font-[family-name:var(--font-heading)] text-5xl leading-[0.94] tracking-[-0.04em] text-[var(--color-foreground)] sm:text-6xl">
                Find pages, events, posts, and news
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--color-muted)] sm:text-lg sm:leading-8">
                Search across the public site from one place. Results include native pages, public content, and live directories.
              </p>
            </div>
          </div>

          <form action="/search" className="grid gap-3">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Search query</span>
              <Input type="search" name="q" defaultValue={queryRaw} placeholder="Search Mekor" />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Search</Button>
              {queryRaw ? (
                <Button asChild variant="ghost">
                  <Link href="/search">Clear</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </Card>

      {queryTerms.length === 0 ? (
        <Card className="px-6 py-8">
          <p className="text-base leading-7 text-[var(--color-muted)]">Enter a search term to see public-site results.</p>
        </Card>
      ) : null}
      {queryTerms.length > 0 && results.length === 0 ? (
        <Card className="px-6 py-8">
          <p className="text-base leading-7 text-[var(--color-muted)]">No results found.</p>
        </Card>
      ) : null}
      {results.length > 0 ? (
        <div className="grid gap-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
            {results.length} result{results.length === 1 ? "" : "s"} for “{queryRaw}”
          </p>
          <div className="grid gap-4">
            {results.map((record) => (
              <Card key={record.path} className="px-5 py-5">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    {record.path}
                  </p>
                  <h2 className="font-[family-name:var(--font-heading)] text-3xl tracking-[-0.03em] text-[var(--color-foreground)]">
                    <Link href={record.path}>{record.title || record.path}</Link>
                  </h2>
                  <p className="text-base leading-7 text-[var(--color-muted)]">{cleanExcerpt(record.excerpt)}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </NativeShell>
  );
}
