import Link from "next/link";
import { notFound } from "next/navigation";

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
    <main className="internal-page px-4 pb-16 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-[84rem] flex-col gap-6 rounded-[36px] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.32)] sm:p-8">
        <Link href="/ask-mekor" className="text-sm font-medium text-[var(--color-muted)]">
          ← Back to Ask Mekor
        </Link>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">Category</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">{category.label}</h1>
          <p className="max-w-[60ch] text-base leading-7 text-[var(--color-muted)]">{category.description}</p>
        </div>
      </section>

      <section className="mx-auto mt-8 w-full max-w-[84rem] overflow-hidden rounded-[30px] border border-[var(--color-border)] bg-white/88 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.32)]">
        {items.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--color-muted)]">No public questions in this category yet.</div>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id} className="border-b border-[var(--color-border)] last:border-b-0">
                <Link href={`/ask-mekor/questions/${item.slug}`} className="block px-6 py-5 transition hover:bg-[var(--color-surface)]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-[var(--color-foreground)]">{item.title}</h2>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        Asked by {item.askerName} · {item.replyCount} repl{item.replyCount === 1 ? "y" : "ies"}
                      </p>
                    </div>
                    <div className="text-sm text-[var(--color-muted)]">
                      {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(item.updatedAt)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
