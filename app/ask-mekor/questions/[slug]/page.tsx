import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicAskMekorQuestionBySlug } from "@/lib/ask-mekor/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AskMekorQuestionPage({ params }: PageProps) {
  const { slug } = await params;
  const question = await getPublicAskMekorQuestionBySlug(slug);

  if (!question) {
    notFound();
  }

  return (
    <main className="internal-page px-4 pb-16 sm:px-6 lg:px-8">
      <article className="mx-auto flex w-full max-w-[84rem] flex-col gap-8">
        <section className="rounded-[36px] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.32)] sm:p-8">
          <Link href={`/ask-mekor/categories/${question.category.slug}`} className="text-sm font-medium text-[var(--color-muted)]">
            ← Back to {question.category.label}
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              {question.category.label}
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">{question.status}</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">{question.title}</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Asked by {question.askerName} on{" "}
            {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(question.createdAt)}
          </p>
          <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-[var(--color-foreground)]">{question.body}</div>
        </section>

        <section className="rounded-[32px] border border-[var(--color-border)] bg-white/88 p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">Responses</h2>
            <span className="text-sm text-[var(--color-muted)]">{question.replies.length} total</span>
          </div>

          {question.replies.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-muted)]">No public responses yet.</p>
          ) : (
            <div className="mt-6 grid gap-4">
              {question.replies.map((reply) => (
                <article key={reply.id} className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--color-foreground)]">{reply.authorDisplayName}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(reply.createdAt)}
                    </p>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--color-foreground)]">{reply.body}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </article>
    </main>
  );
}
