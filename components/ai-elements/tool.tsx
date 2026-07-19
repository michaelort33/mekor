"use client";

import type { ToolUIPart } from "ai";
import { CheckCircle2Icon, CircleDashedIcon, LoaderCircleIcon, WrenchIcon, XCircleIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function statusMeta(state: ToolUIPart["state"]) {
  switch (state) {
    case "input-streaming":
      return { label: "Pending", icon: <CircleDashedIcon className="size-3.5" /> };
    case "input-available":
      return { label: "Running", icon: <LoaderCircleIcon className="size-3.5 animate-spin" /> };
    case "approval-requested":
      return { label: "Awaiting approval", icon: <CircleDashedIcon className="size-3.5" /> };
    case "approval-responded":
      return { label: "Responded", icon: <CheckCircle2Icon className="size-3.5" /> };
    case "output-available":
      return { label: "Done", icon: <CheckCircle2Icon className="size-3.5" /> };
    case "output-error":
      return { label: "Error", icon: <XCircleIcon className="size-3.5" /> };
    case "output-denied":
      return { label: "Denied", icon: <XCircleIcon className="size-3.5" /> };
    default: {
      const _exhaustive: never = state;
      return { label: String(_exhaustive), icon: <WrenchIcon className="size-3.5" /> };
    }
  }
}

export function Tool({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="tool"
      className={cn(
        "mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-strong)_70%,white)] p-2.5",
        className,
      )}
      {...props}
    />
  );
}

export function ToolHeader({
  title,
  state,
  className,
}: {
  title: string;
  state: ToolUIPart["state"];
  className?: string;
}) {
  const meta = statusMeta(state);
  return (
    <div data-slot="tool-header" className={cn("flex items-center justify-between gap-2", className)}>
      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold tracking-wide text-[var(--color-foreground)]">
        <WrenchIcon className="size-3.5 shrink-0 opacity-70" />
        <span className="truncate">{title}</span>
      </div>
      <Badge className="normal-case tracking-normal before:hidden gap-1 px-2 py-0.5 text-[10px] font-semibold">
        {meta.icon}
        {meta.label}
      </Badge>
    </div>
  );
}

export function ToolContent({ className, children }: { className?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <div
      data-slot="tool-content"
      className={cn("mt-2 rounded-lg bg-white/70 px-2.5 py-2 font-mono text-[11px] leading-5 text-[var(--color-muted)]", className)}
    >
      {children}
    </div>
  );
}
