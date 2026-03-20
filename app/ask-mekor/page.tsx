import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Search } from "lucide-react";

import { AskMekorInfoDialog } from "@/components/ask-mekor/ask-mekor-info-dialog";
import { AskMekorLauncher } from "@/components/ask-mekor/ask-mekor-launcher";
import {
  AskMekorCategoryNav,
  AskMekorQuestionTable,
} from "@/components/ask-mekor/ask-mekor-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listPublicAskMekorQuestions } from "@/lib/ask-mekor/service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    submitted?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Ask Mekor | Mekor Habracha",
  description: "Browse recent Mekor Q&A and submit a question to Mekor.",
};

export default async function AskMekorPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const q = (filters.q ?? "").trim();
  const categorySlug = (filters.category ?? "").trim();
  const submitted = (filters.submitted ?? "").trim();
  const hasActiveFilters = Boolean(q || categorySlug);
  const { categories, items } = await listPublicAskMekorQuestions({
    q,
    categorySlug: categorySlug || undefined,
  });
  const latestItems = items.slice(0, 8);

  return (
    <main className="internal-page overflow-hidden px-4 pb-20 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-[84rem] flex-col gap-5 rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.96))] p-5 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.28)] sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <Badge className="w-fit border-[rgba(47,111,168,0.14)] bg-[rgba(47,111,168,0.09)] text-[var(--color-link)]">
              Ask Mekor
            </Badge>
            <div className="space-y-3">
              <h1 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.05em] text-[var(--color-foreground)] sm:text-5xl">
                Ask Mekor
              </h1>
              <p className="max-w-[58ch] text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                Search prior answers, browse by category, and open the ask flow only when you need direct guidance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
              <AskMekorLauncher categories={categories} sourcePath="/ask-mekor" triggerLabel="Ask a question" />
              <AskMekorInfoDialog
                badge="How it works"
                title="How Ask Mekor works"
                description="The board stays compact. Open the details only when you need them."
                triggerLabel="How it works"
                triggerVariant="outline"
              >
                <p>Search existing answers before posting a new question.</p>
                <p>Use a clear title and enough detail so Mekor can answer without unnecessary back-and-forth.</p>
                <p>Posting settings are handled inside the submission form, including private and anonymous options.</p>
              </AskMekorInfoDialog>
              <AskMekorInfoDialog
                badge="Board rules"
                title="Board rules"
                description="Use clear, specific questions so the board stays searchable and useful."
                triggerLabel="Board rules"
                triggerVariant="ghost"
              >
                <p>Use exact product names or concrete practical questions whenever possible.</p>
                <p>When posting publicly, write in a way that helps other people find the answer later.</p>
                <p>If a question belongs to a specific area like Kashrut or Shabbat, choose the right category.</p>
              </AskMekorInfoDialog>
          </div>
        </div>

        <Card className="border-[var(--color-border)] bg-white shadow-none">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <Input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search products, categories, and prior answers"
                  className="pl-11"
                />
              </label>
              <select
                name="category"
                defaultValue={categorySlug}
                className="h-12 rounded-[22px] border border-[var(--color-border-strong)] bg-white/85 px-4 text-[15px] text-[var(--color-foreground)] shadow-[0_15px_35px_-30px_rgba(15,23,42,0.5)] outline-none transition focus:border-[var(--color-ring)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-ring)_14%,transparent)]"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.label}
                  </option>
                ))}
              </select>
              <Button type="submit" className="w-full md:w-auto">
                Search board
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Categories</p>
          <AskMekorCategoryNav categories={categories} selectedSlug={categorySlug || undefined} />
        </div>
      </section>

      {submitted === "private" ? (
        <section className="mx-auto mt-8 w-full max-w-[84rem]">
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-6 py-5 text-sm leading-7 text-emerald-900 shadow-[0_24px_70px_-58px_rgba(16,185,129,0.45)]">
            Your question was received. If you submitted it privately, a Mekor admin will follow up by email, and signed-in askers can continue in their inbox thread.
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-10 flex w-full max-w-[84rem] flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Latest questions</p>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl tracking-[-0.04em] text-[var(--color-foreground)] sm:text-4xl">
            The current board.
          </h2>
        </div>
          {hasActiveFilters ? (
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/ask-mekor">
                View all questions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
        {latestItems.length === 0 ? (
          <AskMekorQuestionTable
            items={latestItems}
            emptyState="No public questions match these filters yet. Try a different search or submit the first question in this area."
          />
        ) : (
          <AskMekorQuestionTable items={latestItems} emptyState="" />
        )}
      </section>
    </main>
  );
}
