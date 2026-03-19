import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AskMekorQuestionSummary, QuestionCategory, QuestionStatus } from "@/lib/ask-mekor/types";
import { cn } from "@/lib/utils";

const categoryThemes: Record<
  string,
  {
    accent: string;
    surface: string;
    border: string;
    glow: string;
  }
> = {
  kashrut: {
    accent: "#94623A",
    surface: "rgba(148,98,58,0.09)",
    border: "rgba(148,98,58,0.22)",
    glow: "rgba(148,98,58,0.18)",
  },
  shabbat: {
    accent: "#0E5E8A",
    surface: "rgba(14,94,138,0.09)",
    border: "rgba(14,94,138,0.22)",
    glow: "rgba(14,94,138,0.18)",
  },
  holidays: {
    accent: "#B44C35",
    surface: "rgba(180,76,53,0.09)",
    border: "rgba(180,76,53,0.22)",
    glow: "rgba(180,76,53,0.18)",
  },
  prayer: {
    accent: "#5D4EA1",
    surface: "rgba(93,78,161,0.09)",
    border: "rgba(93,78,161,0.22)",
    glow: "rgba(93,78,161,0.18)",
  },
  general: {
    accent: "#2F6C5F",
    surface: "rgba(47,108,95,0.09)",
    border: "rgba(47,108,95,0.22)",
    glow: "rgba(47,108,95,0.18)",
  },
};

const statusCopy: Record<QuestionStatus, { label: string; className: string; icon: typeof Clock3 }> = {
  open: {
    label: "Open",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    icon: Clock3,
  },
  answered: {
    label: "Answered",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: CheckCircle2,
  },
  closed: {
    label: "Closed",
    className: "border-slate-200 bg-slate-100 text-slate-700",
    icon: Clock3,
  },
};

function formatDate(value: Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(
    "en-US",
    options ?? {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(value);
}

export function getAskMekorCategoryTheme(categorySlug: string) {
  return (
    categoryThemes[categorySlug] ?? {
      accent: "#6A7280",
      surface: "rgba(106,114,128,0.08)",
      border: "rgba(106,114,128,0.2)",
      glow: "rgba(106,114,128,0.15)",
    }
  );
}

export function AskMekorCategoryBadge({
  category,
  className,
}: {
  category: Pick<QuestionCategory, "slug" | "label">;
  className?: string;
}) {
  const theme = getAskMekorCategoryTheme(category.slug);

  return (
    <Badge
      className={cn("gap-2 border px-3 py-1 text-[10px] tracking-[0.2em]", className)}
      style={{
        borderColor: theme.border,
        backgroundColor: theme.surface,
        color: theme.accent,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
      {category.label}
    </Badge>
  );
}

export function AskMekorStatusBadge({ status, className }: { status: QuestionStatus; className?: string }) {
  const config = statusCopy[status];
  const Icon = config.icon;

  return (
    <Badge className={cn("gap-1.5 border px-3 py-1 text-[10px] tracking-[0.2em]", config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function AskMekorCategoryNav({
  categories,
  selectedSlug,
}: {
  categories: QuestionCategory[];
  selectedSlug?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/ask-mekor"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
            !selectedSlug
              ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white"
              : "border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]",
          )}
        >
          <span>All</span>
        </Link>
        {categories.map((category) => {
          const theme = getAskMekorCategoryTheme(category.slug);
          const selected = selectedSlug === category.slug;

          return (
            <Link
              key={category.id}
              href={`/ask-mekor?category=${category.slug}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                selected ? "shadow-[0_14px_28px_-24px_rgba(15,23,42,0.4)]" : "bg-white hover:-translate-y-0.5",
              )}
              style={{
                borderColor: selected ? theme.accent : theme.border,
                backgroundColor: selected ? theme.surface : "rgba(255,255,255,0.92)",
                color: selected ? theme.accent : "var(--color-foreground)",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
              <span>{category.label}</span>
              <span className="text-xs opacity-75">{category.publicQuestionCount}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AskMekorQuestionCard({
  item,
  compact = false,
}: {
  item: AskMekorQuestionSummary;
  compact?: boolean;
}) {
  return (
    <Link href={`/ask-mekor/questions/${item.slug}`} className="group block">
      <Card className={cn("rounded-[22px] border border-[var(--color-border)] bg-white shadow-none transition hover:border-[var(--color-border-strong)]", compact ? "" : "")}>
        <CardContent className={cn("space-y-3", compact ? "p-4" : "p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <h3
                className={cn(
                  "break-words font-[family-name:var(--font-heading)] tracking-[-0.03em] text-[var(--color-foreground)] transition group-hover:text-[var(--color-link)]",
                  compact ? "text-xl leading-tight" : "text-2xl leading-tight",
                )}
              >
                {item.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <AskMekorCategoryBadge category={item.category} />
                <AskMekorStatusBadge status={item.status} />
              </div>
              <p className="text-sm text-[var(--color-muted)]">Asked by {item.askerName} on {formatDate(item.createdAt)}</p>
            </div>
            <div className="shrink-0 text-right text-sm text-[var(--color-muted)]">
              <div>{item.replyCount} repl{item.replyCount === 1 ? "y" : "ies"}</div>
              <div>{formatDate(item.updatedAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AskMekorQuestionTable({
  items,
  emptyState,
}: {
  items: AskMekorQuestionSummary[];
  emptyState: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="border-[var(--color-border)] bg-white/88">
        <CardContent className="p-8 text-sm leading-7 text-[var(--color-muted)]">{emptyState}</CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:hidden">
        {items.map((item) => (
          <AskMekorQuestionCard key={item.id} item={item} compact />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white lg:block">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[56%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-left">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Topic</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Category</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Replies</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Activity</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface)]">
                <td className="px-6 py-5 align-top">
                  <Link href={`/ask-mekor/questions/${item.slug}`} className="group block min-w-0">
                    <h3 className="break-words font-[family-name:var(--font-heading)] text-[1.45rem] leading-tight tracking-[-0.03em] text-[var(--color-foreground)] transition group-hover:text-[var(--color-link)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 break-words text-sm text-[var(--color-muted)]">
                      Asked by {item.askerName} on {formatDate(item.createdAt)}
                    </p>
                  </Link>
                </td>
                <td className="px-4 py-5 align-top">
                  <div className="flex flex-wrap items-center gap-2">
                    <AskMekorCategoryBadge category={item.category} />
                    <AskMekorStatusBadge status={item.status} className="px-2.5 py-1 text-[9px]" />
                  </div>
                </td>
                <td className="px-4 py-5 align-top text-sm font-semibold text-[var(--color-foreground)]">{item.replyCount}</td>
                <td className="px-6 py-5 align-top text-sm leading-7 text-[var(--color-muted)]">
                  <div className="break-words">{formatDate(item.updatedAt)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
