"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

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
import type { QuestionCategory } from "@/lib/ask-mekor/types";

type AskMekorLauncherProps = {
  categories: QuestionCategory[];
  sourcePath: string;
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
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "default",
  title,
  description,
  wide = false,
}: AskMekorLauncherProps) {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.location.hash === "#ask-question");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={wide ? "w-full sm:w-auto" : undefined}>
          <Sparkles className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="max-w-[38rem] overflow-y-auto px-5 sm:px-7">
        <SheetHeader>
          <SheetTitle>{title ?? "Ask Mekor"}</SheetTitle>
          <SheetDescription>
            {description ?? "Submit your question here, then choose whether it should post publicly or stay private."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <AskMekorForm
            categories={categories}
            sourcePath={sourcePath}
            title="Submit a question"
            description="Use the settings below to decide how the question should appear."
            submitLabel="Submit question"
            className="border-white/70 bg-white/92 shadow-none"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
