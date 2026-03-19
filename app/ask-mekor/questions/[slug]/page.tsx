import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, MessageSquareQuote, NotebookText } from "lucide-react";

import { AskMekorLauncher } from "@/components/ask-mekor/ask-mekor-launcher";
import {
  AskMekorCategoryBadge,
  AskMekorQuestionCard,
  AskMekorSidebarCta,
  AskMekorStatusBadge,
  getAskMekorCategoryTheme,
} from "@/components/ask-mekor/ask-mekor-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPublicAskMekorQuestionBySlug, listPublicAskMekorQuestions } from "@/lib/ask-mekor/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

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
  const theme = getAskMekorCategoryTheme(question.category.slug);
  const primaryReply = question.replies[0] ?? null;
  const followUps = primaryReply ? question.replies.slice(1) : question.replies;

  return (
    <main className="internal-page px-4 pb-20 sm:px-6 lg:px-8">
      <article className="mx-auto flex w-full max-w-[84rem] flex-col gap-8">
        <section
          className="overflow-hidden rounded-[40px] border bg-[radial-gradient(circle_at_top_left,rgba(47,111,168,0.13),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,240,232,0.95))] shadow-[0_36px_100px_-60px_rgba(15,23,42,0.45)]"
          style={{ borderColor: theme.border }}
        >
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:p-10">
            <div className="space-y-6">
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

              <div className="space-y-4">
                <h1 className="max-w-[16ch] font-[family-name:var(--font-heading)] text-5xl tracking-[-0.05em] text-[var(--color-foreground)] sm:text-6xl">
                  {question.title}
                </h1>
                <p className="max-w-[60ch] text-base leading-8 text-[var(--color-muted)]">
                  Asked by {question.askerName} on {formatLongDate(question.createdAt)}
                </p>
              </div>
            </div>

            <Card className="border bg-white/84 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.35)]" style={{ borderColor: theme.border }}>
              <CardContent className="space-y-5 p-6">
                <Badge className="w-fit">Question summary</Badge>
                <div className="grid gap-4 text-sm text-[var(--color-muted)]">
                  <div className="flex items-start gap-3">
                    <MessageSquareQuote className="mt-1 h-4 w-4 text-[var(--color-link)]" />
                    <div>
                      <p className="font-semibold text-[var(--color-foreground)]">{question.replies.length} total responses</p>
                      <p className="leading-7">Short authoritative answers are highlighted first.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-1 h-4 w-4 text-[var(--color-link)]" />
                    <div>
                      <p className="font-semibold text-[var(--color-foreground)]">Updated {formatShortDate(question.updatedAt)}</p>
                      <p className="leading-7">Track newer replies and follow-up clarifications here.</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <AskMekorLauncher
                  categories={categories}
                  sourcePath={`/ask-mekor/questions/${question.slug}`}
                  initialVisibility="private"
                  triggerLabel="Ask your own private question"
                  triggerVariant="outline"
                  wide
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-6">
            <Card className="border-[var(--color-border)] bg-white/92">
              <CardContent className="space-y-4 p-6 sm:p-8">
                <Badge>Original question</Badge>
                <div className="whitespace-pre-wrap text-base leading-8 text-[var(--color-foreground)]">{question.body}</div>
              </CardContent>
            </Card>

            {primaryReply ? (
              <Card className="border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.92),rgba(255,255,255,0.96))] shadow-[0_34px_90px_-62px_rgba(16,185,129,0.5)]">
                <CardContent className="space-y-4 p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-900">Mekor answer</Badge>
                    <p className="text-sm text-emerald-900/80">{formatShortDate(primaryReply.createdAt)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-[var(--color-foreground)]">{primaryReply.authorDisplayName}</p>
                    <div className="whitespace-pre-wrap text-base leading-8 text-[var(--color-foreground)]">{primaryReply.body}</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-[var(--color-border)] bg-white/90">
                <CardContent className="p-6 sm:p-8">
                  <Badge className="mb-4">Awaiting answer</Badge>
                  <p className="text-sm leading-7 text-[var(--color-muted)]">
                    No public answer is posted yet. If your situation is time-sensitive or personal, use the private ask flow instead.
                  </p>
                </CardContent>
              </Card>
            )}

            {followUps.length > 0 ? (
              <section className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Follow-up discussion</p>
                  <h2 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.04em] text-[var(--color-foreground)]">
                    Clarifications and later updates.
                  </h2>
                </div>
                <div className="grid gap-4">
                  {followUps.map((reply) => (
                    <Card key={reply.id} className="border-[var(--color-border)] bg-white/88">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-semibold text-[var(--color-foreground)]">{reply.authorDisplayName}</p>
                          <p className="text-sm text-[var(--color-muted)]">{formatShortDate(reply.createdAt)}</p>
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--color-foreground)]">{reply.body}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <AskMekorSidebarCta />
            <Card className="border-[rgba(31,48,67,0.1)] bg-white/88 shadow-[0_28px_70px_-56px_rgba(15,23,42,0.28)]">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Related in {question.category.label}</p>
                    <h2 className="font-[family-name:var(--font-heading)] text-3xl tracking-[-0.04em] text-[var(--color-foreground)]">
                      Keep browsing
                    </h2>
                  </div>
                  <NotebookText className="h-5 w-5 text-[var(--color-link)]" />
                </div>
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
          </div>
        </section>
      </article>
    </main>
  );
}
