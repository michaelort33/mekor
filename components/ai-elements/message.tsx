"use client";

import type { UIMessage } from "ai";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Message({
  from,
  className,
  ...props
}: ComponentProps<"div"> & { from: UIMessage["role"] }) {
  return (
    <div
      data-slot="message"
      data-role={from}
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl px-3.5 py-3 text-sm leading-6",
        from === "user"
          ? "ml-auto max-w-[92%] bg-[linear-gradient(180deg,#2f6fa8_0%,#214e79_100%)] text-[#f8fbff]"
          : "mr-auto max-w-[96%] border border-[var(--color-border)] bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function MessageContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="message-content" className={cn("whitespace-pre-wrap", className)} {...props} />;
}

/** Streaming-safe plain text response (no markdown HTML injection). */
export function MessageResponse({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-slot="message-response" className={cn("text-sm leading-6", className)}>
      {children}
    </div>
  );
}
