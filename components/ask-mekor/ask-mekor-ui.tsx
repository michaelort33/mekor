import Link from "next/link";
import { ArrowRight, BookMarked, CheckCircle2, Clock3, LockKeyhole, MessageSquareQuote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    icon: LockKeyhole,
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

export function AskMekorCategoryCard({ category }: { category: QuestionCategory }) {
  const theme = getAskMekorCategoryTheme(category.slug);

  return (
    <Link href={`/ask-mekor/categories/${category.slug}`} className="group block">
      <Card
        className="relative h-full overflow-hidden border bg-white/88 transition duration-200 hover:-translate-y-1"
        style={{
          borderColor: theme.border,
          boxShadow: `0 28px 80px -50px ${theme.glow}`,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5 transition duration-200 group-hover:h-2.5"
          style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }}
        />
        <CardContent className="flex h-full flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.surface,
                color: theme.accent,
              }}
            >
              <BookMarked className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              {category.publicQuestionCount} topics
            </span>
          </div>
          <div className="space-y-2">
            <h3 className="font-[family-name:var(--font-heading)] text-2xl tracking-[-0.03em] text-[var(--color-foreground)]">
              {category.label}
            </h3>
            <p className="text-sm leading-7 text-[var(--color-muted)]">{category.description}</p>
          </div>
          <div className="mt-auto flex items-center gap-2 text-sm font-semibold" style={{ color: theme.accent }}>
            Browse questions
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AskMekorQuestionCard({
  item,
  compact = false,
}: {
  item: AskMekorQuestionSummary;
  compact?: boolean;
}) {
  const theme = getAskMekorCategoryTheme(item.category.slug);

  return (
    <Link href={`/ask-mekor/questions/${item.slug}`} className="group block">
      <Card
        className={cn(
          "overflow-hidden border bg-white/90 transition duration-200 hover:-translate-y-1 hover:bg-white",
          compact ? "rounded-[28px]" : "rounded-[30px]",
        )}
        style={{
          borderColor: theme.border,
          boxShadow: `0 28px 80px -54px ${theme.glow}`,
        }}
      >
        <CardContent className={cn("space-y-5", compact ? "p-5" : "p-6")}>
          <div className="flex flex-wrap items-center gap-2">
            <AskMekorCategoryBadge category={item.category} />
            <AskMekorStatusBadge status={item.status} />
          </div>

          <div className="space-y-2">
            <h3
              className={cn(
                "font-[family-name:var(--font-heading)] tracking-[-0.03em] text-[var(--color-foreground)] transition group-hover:text-[var(--color-link)]",
                compact ? "text-2xl" : "text-[2rem]",
              )}
            >
              {item.title}
            </h3>
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Asked by {item.askerName} on {formatDate(item.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-2">
              <MessageSquareQuote className="h-4 w-4" />
              {item.replyCount} repl{item.replyCount === 1 ? "y" : "ies"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Updated {formatDate(item.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AskMekorSidebarCta({ href = "/ask-mekor#ask-private" }: { href?: string }) {
  return (
    <Card className="overflow-hidden border-[rgba(31,48,67,0.12)] bg-[linear-gradient(180deg,rgba(31,48,67,0.98),rgba(20,32,48,0.96))] text-white shadow-[0_36px_90px_-48px_rgba(15,23,42,0.72)]">
      <CardContent className="space-y-5 p-6">
        <Badge className="border-white/15 bg-white/10 text-[rgba(255,255,255,0.8)]">Private help</Badge>
        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-heading)] text-3xl tracking-[-0.03em] text-white">
            Need an answer that stays between you and Mekor?
          </h3>
          <p className="text-sm leading-7 text-[rgba(255,255,255,0.72)]">
            Private questions stay off the public board. Signed-in askers continue the conversation in their inbox thread.
          </p>
        </div>
        <Button asChild variant="secondary" className="w-full bg-white/14 text-white hover:bg-white/20">
          <Link href={href}>Ask privately</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
