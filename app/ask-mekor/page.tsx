import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Compass, Search, ShieldCheck, Sparkles } from "lucide-react";

import { AskMekorLauncher } from "@/components/ask-mekor/ask-mekor-launcher";
import {
  AskMekorCategoryCard,
  AskMekorQuestionCard,
  AskMekorSidebarCta,
} from "@/components/ask-mekor/ask-mekor-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  description: "Browse recent Mekor Q&A and submit a public or private question.",
};

export default async function AskMekorPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const q = (filters.q ?? "").trim();
  const categorySlug = (filters.category ?? "").trim();
  const submitted = (filters.submitted ?? "").trim();
  const { categories, items } = await listPublicAskMekorQuestions({
    q,
    categorySlug: categorySlug || undefined,
  });
  const featuredItems = items.filter((item) => item.replyCount > 0).slice(0, 3);
  const latestItems = items.slice(0, 8);

  return (
    <main className="internal-page overflow-hidden px-4 pb-20 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-[84rem] flex-col gap-10 rounded-[40px] border border-[rgba(31,48,67,0.1)] bg-[radial-gradient(circle_at_top_left,rgba(47,111,168,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(164,123,82,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(245,239,230,0.96))] p-6 shadow-[0_38px_120px_-64px_rgba(15,23,42,0.45)] sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_24rem]">
          <div className="space-y-8">
            <div className="space-y-5">
              <Badge className="w-fit border-[rgba(47,111,168,0.14)] bg-[rgba(47,111,168,0.09)] text-[var(--color-link)]">
                Ask Mekor
              </Badge>
              <div className="space-y-4">
                <h1 className="font-[family-name:var(--font-heading)] text-5xl tracking-[-0.05em] text-[var(--color-foreground)] sm:text-6xl">
                  Ask Mekor
                </h1>
                <p className="max-w-[60ch] text-base leading-8 text-[var(--color-muted)] sm:text-lg">
                  Ask Mekor is a public knowledge board for practical halachic questions and a private intake desk for sensitive ones.
                  Browse prior answers first, then choose the public or private path that fits your question.
                </p>
              </div>
            </div>

            <Card className="border-white/80 bg-white/80 shadow-[0_30px_90px_-56px_rgba(15,23,42,0.45)]">
              <CardContent className="space-y-5 p-5 sm:p-6">
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

                <div className="flex flex-wrap gap-3">
                  <AskMekorLauncher categories={categories} sourcePath="/ask-mekor" triggerLabel="Post a public question" />
                  <AskMekorLauncher
                    categories={categories}
                    sourcePath="/ask-mekor"
                    initialVisibility="private"
                    triggerLabel="Ask a private question"
                    triggerVariant="outline"
                    title="Ask Mekor privately"
                    description="Use this for personal or sensitive questions. Only the Mekor admin team and the asker can access it."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-[rgba(47,111,168,0.14)] bg-white/82 shadow-[0_24px_70px_-52px_rgba(47,111,168,0.45)]">
                <CardContent className="space-y-3 p-5">
                  <Sparkles className="h-5 w-5 text-[var(--color-link)]" />
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl tracking-[-0.03em] text-[var(--color-foreground)]">
                    Public archive
                  </h2>
                  <p className="text-sm leading-7 text-[var(--color-muted)]">Searchable answers for products, practice questions, and recurring community needs.</p>
                </CardContent>
              </Card>
              <Card className="border-[rgba(31,48,67,0.12)] bg-white/82 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]">
                <CardContent className="space-y-3 p-5">
                  <ShieldCheck className="h-5 w-5 text-[var(--color-foreground)]" />
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl tracking-[-0.03em] text-[var(--color-foreground)]">
                    Private intake
                  </h2>
                  <p className="text-sm leading-7 text-[var(--color-muted)]">Use the same desk to submit questions that should stay between you and Mekor.</p>
                </CardContent>
              </Card>
              <Card className="border-[rgba(164,123,82,0.16)] bg-white/82 shadow-[0_24px_70px_-52px_rgba(164,123,82,0.35)]">
                <CardContent className="space-y-3 p-5">
                  <Compass className="h-5 w-5 text-[#94623A]" />
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl tracking-[-0.03em] text-[var(--color-foreground)]">
                    Browse by area
                  </h2>
                  <p className="text-sm leading-7 text-[var(--color-muted)]">Start by category when you already know the topic area and want faster discovery.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="overflow-hidden border-[rgba(31,48,67,0.12)] bg-[linear-gradient(180deg,rgba(31,48,67,0.98),rgba(20,32,48,0.96))] text-white shadow-[0_36px_90px_-48px_rgba(15,23,42,0.72)]">
            <CardContent className="space-y-6 p-6">
              <Badge className="border-white/15 bg-white/10 text-[rgba(255,255,255,0.8)]">How it works</Badge>
              <div className="space-y-4">
                <h2 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.04em] text-white">
                  A better front door than a generic forum.
                </h2>
                <p className="text-sm leading-7 text-[rgba(255,255,255,0.72)]">
                  Public questions become part of the searchable board. Private questions open a direct admin conversation without exposing the issue publicly.
                </p>
              </div>
              <Separator className="bg-white/10" />
              <div className="grid gap-4">
                {[
                  "Search existing answers before posting.",
                  "Choose public or private based on sensitivity.",
                  "Track answered questions and recent updates by category.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-[24px] border border-white/10 bg-white/6 p-4">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-white/80" />
                    <p className="text-sm leading-7 text-[rgba(255,255,255,0.78)]">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {submitted === "private" ? (
        <section className="mx-auto mt-8 w-full max-w-[84rem]">
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-6 py-5 text-sm leading-7 text-emerald-900 shadow-[0_24px_70px_-58px_rgba(16,185,129,0.45)]">
            Your private question was received. A Mekor admin will follow up by email, and signed-in askers can continue the conversation in their inbox thread.
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-12 flex w-full max-w-[84rem] flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Browse by category</p>
            <h2 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.04em] text-[var(--color-foreground)]">
              Start with the topic area.
            </h2>
          </div>
          <Button asChild variant="ghost">
            <Link href="/ask-mekor?category=">
              View all questions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <AskMekorCategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 flex w-full max-w-[84rem] flex-col gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Featured answers</p>
          <h2 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.04em] text-[var(--color-foreground)]">
            Answered questions worth surfacing first.
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {(featuredItems.length > 0 ? featuredItems : latestItems.slice(0, 3)).map((item) => (
            <AskMekorQuestionCard key={item.id} item={item} compact />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 grid w-full max-w-[84rem] gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Latest questions</p>
              <h2 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.04em] text-[var(--color-foreground)]">
                The current board.
              </h2>
            </div>
          </div>
          {latestItems.length === 0 ? (
            <Card className="border-[var(--color-border)] bg-white/88">
              <CardContent className="p-8 text-sm leading-7 text-[var(--color-muted)]">
                No public questions match these filters yet. Try a different search or submit the first question in this area.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {latestItems.map((item) => (
                <AskMekorQuestionCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <AskMekorSidebarCta />
          <Card className="border-[rgba(31,48,67,0.1)] bg-white/88 shadow-[0_28px_70px_-56px_rgba(15,23,42,0.28)]">
            <CardContent className="space-y-4 p-6">
              <Badge>Board rules</Badge>
              <div className="space-y-3 text-sm leading-7 text-[var(--color-muted)]">
                <p>Use clear titles with the exact product or practice question whenever possible.</p>
                <p>Public posts should be broadly useful. Personal situations are better handled privately.</p>
                <p>Short, authoritative answers are intentional. The board is an answer desk, not a debate thread.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
