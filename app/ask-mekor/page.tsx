import Link from "next/link";
import type { Metadata } from "next";

import { AskMekorForm } from "@/components/ask-mekor/ask-mekor-form";
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

  return (
    <main className="internal-page px-4 pb-16 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-[84rem] flex-col gap-8 rounded-[36px] border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,238,227,0.94))] p-6 shadow-[0_32px_90px_-52px_rgba(15,23,42,0.35)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Ask Mekor</p>
            <h1 className="max-w-[12ch] text-4xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)] sm:text-5xl">
              Public answers and private rabbi/admin questions.
            </h1>
            <p className="max-w-[60ch] text-base leading-7 text-[var(--color-muted)] sm:text-lg">
              Use the public board to browse recent halachic and community questions. Use the same form to send a private question that only Mekor admins and the asker can access.
            </p>
          </div>
          <div className="rounded-[28px] border border-[var(--color-border)] bg-white/70 p-5">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Browse by category</h2>
            <div className="mt-4 grid gap-3">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/ask-mekor/categories/${category.slug}`}
                  className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-border-strong)] hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-[var(--color-foreground)]">{category.label}</span>
                    <span className="text-sm text-[var(--color-muted)]">{category.publicQuestionCount}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{category.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <AskMekorForm categories={categories} sourcePath="/ask-mekor" />
      </section>

      <section className="mx-auto mt-10 flex w-full max-w-[84rem] flex-col gap-6">
        {submitted === "private" ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            Your private question was received. A Mekor admin will follow up by email, and signed-in askers can continue the conversation in their inbox thread.
          </div>
        ) : null}
        <form className="grid gap-4 rounded-[28px] border border-[var(--color-border)] bg-white/82 p-5 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.28)] md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search titles, categories, or question details"
            className="h-12 rounded-[16px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
          />
          <select
            name="category"
            defaultValue={categorySlug}
            className="h-12 rounded-[16px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-12 rounded-[16px] bg-[var(--color-foreground)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Filter
          </button>
        </form>

        <div className="overflow-hidden rounded-[30px] border border-[var(--color-border)] bg-white/88 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.32)]">
          <div className="grid grid-cols-[minmax(0,1fr)_96px_140px] gap-4 border-b border-[var(--color-border)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            <span>Topic</span>
            <span>Replies</span>
            <span>Activity</span>
          </div>
          {items.length === 0 ? (
            <div className="px-6 py-10 text-sm text-[var(--color-muted)]">No public questions match these filters yet.</div>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-b border-[var(--color-border)] last:border-b-0">
                  <Link
                    href={`/ask-mekor/questions/${item.slug}`}
                    className="grid grid-cols-[minmax(0,1fr)_96px_140px] gap-4 px-6 py-5 transition hover:bg-[var(--color-surface)]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                          {item.category.label}
                        </span>
                        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
                          {item.status}
                        </span>
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-[var(--color-foreground)]">{item.title}</h2>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">Asked by {item.askerName}</p>
                    </div>
                    <div className="self-center text-sm font-semibold text-[var(--color-foreground)]">{item.replyCount}</div>
                    <div className="self-center text-sm text-[var(--color-muted)]">
                      {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(item.updatedAt)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
