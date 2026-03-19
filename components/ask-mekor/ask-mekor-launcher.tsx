"use client";

import { useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

import { AskMekorForm } from "@/components/ask-mekor/ask-mekor-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { QuestionCategory, QuestionVisibility } from "@/lib/ask-mekor/types";

type AskMekorLauncherProps = {
  categories: QuestionCategory[];
  sourcePath: string;
  initialVisibility?: QuestionVisibility;
  triggerLabel: string;
  triggerVariant?: "default" | "secondary" | "outline" | "ghost";
  triggerSize?: "default" | "sm" | "lg" | "icon";
  title?: string;
  description?: string;
  wide?: boolean;
};

export function AskMekorLauncher({
  categories,
  sourcePath,
  initialVisibility = "public",
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "default",
  title,
  description,
  wide = false,
}: AskMekorLauncherProps) {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.location.hash === "#ask-private" && initialVisibility === "private");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={wide ? "w-full sm:w-auto" : undefined}>
          {initialVisibility === "private" ? <ShieldCheck className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="max-w-[38rem] overflow-y-auto px-5 sm:px-7">
        <SheetHeader>
          <SheetTitle>{title ?? (initialVisibility === "private" ? "Ask a private question" : "Ask Mekor")}</SheetTitle>
          <SheetDescription>
            {description ??
              (initialVisibility === "private"
                ? "Private questions are only visible to Mekor admins and the asker."
                : "Search first, then post publicly if your question is not already answered.")}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <AskMekorForm
            categories={categories}
            sourcePath={sourcePath}
            initialVisibility={initialVisibility}
            title={initialVisibility === "private" ? "Private question" : "Submit a question"}
            description={
              initialVisibility === "private"
                ? "Share the practical details. A Mekor admin can continue with you privately."
                : "Public questions appear on the board so others can benefit from the answer."
            }
            submitLabel={initialVisibility === "private" ? "Send private question" : "Post question"}
            className="border-white/70 bg-white/92 shadow-none"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
