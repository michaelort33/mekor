import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenText } from "lucide-react";

import { AskMekorLauncher } from "@/components/ask-mekor/ask-mekor-launcher";
import {
  AskMekorCategoryBadge,
  AskMekorQuestionCard,
  getAskMekorCategoryTheme,
} from "@/components/ask-mekor/ask-mekor-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listPublicAskMekorQuestions } from "@/lib/ask-mekor/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AskMekorCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const { categories, items } = await listPublicAskMekorQuestions({ categorySlug: slug });
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

  const theme = getAskMekorCategoryTheme(category.slug);

  return (
    <main className="internal-page px-4 pb-20 sm:px-6 lg:px-8">
      <section
        className="mx-auto flex w-full max-w-[84rem] flex-col gap-8 rounded-[40px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,240,232,0.95))] p-6 shadow-[0_36px_100px_-60px_rgba(15,23,42,0.45)] sm:p-8 lg:p-10"
        style={{ borderColor: theme.border }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button asChild variant="ghost">
            <Link href="/ask-mekor">
              <ArrowLeft className="h-4 w-4" />
              Back to Ask Mekor
            </Link>
          </Button>
          <AskMekorLauncher
            categories={categories}
            sourcePath={`/ask-mekor/categories/${category.slug}`}
            triggerLabel={`Ask in ${category.label}`}
            title={`Ask a ${category.label} question`}
            description={`Post a public ${category.label.toLowerCase()} question or switch to private if the issue is sensitive.`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-5">
            <AskMekorCategoryBadge category={category} className="w-fit" />
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-heading)] text-5xl tracking-[-0.05em] text-[var(--color-foreground)] sm:text-6xl">
                {category.label}
              </h1>
              <p className="max-w-[58ch] text-base leading-8 text-[var(--color-muted)] sm:text-lg">
                {category.description || `Browse public ${category.label.toLowerCase()} questions and answers from the Mekor board.`}
              </p>
            </div>
          </div>

          <Card className="border bg-white/80 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.35)]" style={{ borderColor: theme.border }}>
            <CardContent className="space-y-4 p-6">
              <div
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.accent }}
              >
                <BookOpenText className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Public topics</p>
                <p className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.04em] text-[var(--color-foreground)]">
                  {category.publicQuestionCount}
                </p>
              </div>
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                Use this category page to scan open questions, answered items, and recurring topics in one place.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto mt-12 flex w-full max-w-[84rem] flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Category feed</p>
            <h2 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.04em] text-[var(--color-foreground)]">
              Recent questions in {category.label}.
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/ask-mekor">
              Browse all categories
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <Card className="border-[var(--color-border)] bg-white/88">
            <CardContent className="p-8">
              <Badge className="mb-4">Empty category</Badge>
              <p className="max-w-[46rem] text-sm leading-7 text-[var(--color-muted)]">
                No public questions are listed here yet. You can submit the first question for this category from the Ask Mekor flow.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <AskMekorQuestionCard key={item.id} item={item} compact />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
