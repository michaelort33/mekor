import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { AskMekorLauncher } from "@/components/ask-mekor/ask-mekor-launcher";
import {
  AskMekorCategoryBadge,
  AskMekorCategoryNav,
  AskMekorQuestionTable,
} from "@/components/ask-mekor/ask-mekor-ui";
import { Button } from "@/components/ui/button";
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

  return (
    <main className="internal-page px-4 pb-20 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-[84rem] flex-col gap-5 rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.96))] p-5 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.28)] sm:p-6 lg:p-8">
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

        <div className="space-y-4">
          <AskMekorCategoryBadge category={category} className="w-fit" />
          <div className="space-y-3">
            <h1 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.05em] text-[var(--color-foreground)] sm:text-5xl">
              {category.label}
            </h1>
            <p className="max-w-[58ch] text-sm leading-7 text-[var(--color-muted)] sm:text-base">
              {category.description || `Browse public ${category.label.toLowerCase()} questions and answers from the Mekor board.`}
            </p>
          </div>
          <AskMekorCategoryNav categories={categories} selectedSlug={category.slug} />
        </div>
      </section>

      <section className="mx-auto mt-10 flex w-full max-w-[84rem] flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Category feed</p>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl tracking-[-0.04em] text-[var(--color-foreground)] sm:text-4xl">
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
          <AskMekorQuestionTable
            items={items}
            emptyState="No public questions are listed here yet. You can submit the first question for this category from the Ask Mekor flow."
          />
        ) : (
          <AskMekorQuestionTable items={items} emptyState="" />
        )}
      </section>
    </main>
  );
}
