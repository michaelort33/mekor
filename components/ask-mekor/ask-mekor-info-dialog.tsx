"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AskMekorInfoDialogProps = {
  badge?: string;
  title: string;
  description?: string;
  triggerLabel: string;
  triggerVariant?: "default" | "secondary" | "outline" | "ghost";
  children: React.ReactNode;
};

export function AskMekorInfoDialog({
  badge,
  title,
  description,
  triggerLabel,
  triggerVariant = "outline",
  children,
}: AskMekorInfoDialogProps) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button variant={triggerVariant}>{triggerLabel}</Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(9,15,28,0.45)] backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-[rgba(31,48,67,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,236,0.97))] p-6 shadow-[0_36px_100px_-42px_rgba(15,23,42,0.55)] sm:p-7",
          )}
        >
          <div className="space-y-5">
            <div className="space-y-3 pr-10">
              {badge ? <Badge className="w-fit">{badge}</Badge> : null}
              <div className="space-y-2">
                <DialogPrimitive.Title className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.04em] text-[var(--color-foreground)]">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="text-sm leading-7 text-[var(--color-muted)]">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 text-sm leading-7 text-[var(--color-muted)]">{children}</div>
          </div>

          <DialogPrimitive.Close className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/80 text-[var(--color-foreground)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
