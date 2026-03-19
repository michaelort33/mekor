import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { AskMekorLauncher } from "@/components/ask-mekor/ask-mekor-launcher";
import {
  AskMekorCategoryBadge,
  AskMekorQuestionCard,
  AskMekorStatusBadge,
} from "@/components/ask-mekor/ask-mekor-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicAskMekorQuestionBySlug, listPublicAskMekorQuestions } from "@/lib/ask-mekor/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const question = await getPublicAskMekorQuestionBySlug(slug);

  if (!question) {
    return {
      title: "Ask Mekor | Mekor Habracha",
      description: "Browse recent Mekor Q&A and submit a question to Mekor.",
    };
  }

  return {
    title: `${question.title} | Ask Mekor`,
    description: `Browse this ${question.category.label.toLowerCase()} question and Mekor's public answer.`,
  };
}

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function AskMekorThreadPost({
  author,
  createdAt,
  body,
  badge,
  emphasize = false,
}: {
  author: string;
  createdAt: Date;
  body: string;
  badge?: string;
  emphasize?: boolean;
}) {
  return (
    <article
      className={emphasize ? "rounded-[18px] border border-emerald-200 bg-emerald-50/60" : "rounded-[18px] border border-[var(--color-border)] bg-white"}
    >
      <div className="space-y-4 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[var(--color-foreground)]">{author}</p>
            {badge ? (
              <Badge className="border-[rgba(31,48,67,0.12)] bg-[var(--color-surface)] text-[var(--color-foreground)]">{badge}</Badge>
            ) : null}
          </div>
          <p className="text-sm text-[var(--color-muted)]">{formatShortDate(createdAt)}</p>
        </div>
        <div className="whitespace-pre-wrap text-[15px] leading-8 text-[var(--color-foreground)]">{body}</div>
      </div>
    </article>
  );
}

export default async function AskMekorQuestionPage({ params }: PageProps) {
  const { slug } = await params;
  const question = await getPublicAskMekorQuestionBySlug(slug);

  if (!question) {
    notFound();
  }

  const { categories, items } = await listPublicAskMekorQuestions({
    categorySlug: question.category.slug,
    limit: 4,
  });
  const related = items.filter((item) => item.id !== question.id).slice(0, 3);

  return (
    <main className="internal-page px-4 pb-20 sm:px-6 lg:px-8">
      <article className="mx-auto flex w-full max-w-[84rem] flex-col gap-8">
        <section className="flex flex-col gap-5 border-b border-[var(--color-border)] pb-6">
          <Button asChild variant="ghost" className="-ml-2 w-fit">
            <Link href={`/ask-mekor/categories/${question.category.slug}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to {question.category.label}
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <AskMekorCategoryBadge category={question.category} />
            <AskMekorStatusBadge status={question.status} />
          </div>

          <div className="space-y-3">
            <h1 className="max-w-[18ch] font-[family-name:var(--font-heading)] text-4xl tracking-[-0.05em] text-[var(--color-foreground)] sm:text-5xl">
              {question.title}
            </h1>
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Asked by {question.askerName} on {formatLongDate(question.createdAt)}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            <AskMekorThreadPost author={question.askerName} createdAt={question.createdAt} body={question.body} badge="Question" />

            {question.replies.length > 0 ? (
              question.replies.map((reply, index) => (
                <AskMekorThreadPost
                  key={reply.id}
                  author={reply.authorDisplayName}
                  createdAt={reply.createdAt}
                  body={reply.body}
                  badge="Mekor"
                  emphasize={index === 0}
                />
              ))
            ) : (
              <article className="rounded-[18px] border border-[var(--color-border)] bg-white">
                <div className="px-5 py-5 text-sm leading-7 text-[var(--color-muted)] sm:px-6">
                  No public answer is posted yet. If you need your own guidance now, submit a question from here.
                </div>
              </article>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="rounded-[20px] border border-[var(--color-border)] bg-white shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Continue browsing</p>
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl tracking-[-0.04em] text-[var(--color-foreground)]">
                    More in {question.category.label}
                  </h2>
                </div>
                <AskMekorLauncher
                  categories={categories}
                  sourcePath={`/ask-mekor/questions/${question.slug}`}
                  triggerLabel="Ask a question"
                  triggerVariant="outline"
                  wide
                />
                {related.length === 0 ? (
                  <p className="text-sm leading-7 text-[var(--color-muted)]">No related public questions are available yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {related.map((item) => (
                      <AskMekorQuestionCard key={item.id} item={item} compact />
                    ))}
                  </div>
                )}
                <Button asChild variant="ghost" className="w-full justify-between">
                  <Link href={`/ask-mekor/categories/${question.category.slug}`}>
                    View all {question.category.label} questions
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </section>
      </article>
    </main>
  );
}
