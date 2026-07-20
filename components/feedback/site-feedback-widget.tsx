"use client";

import { MessageCircleHeart } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { FeedbackChatPanel } from "@/components/feedback/feedback-chat-panel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { shouldHideFeedbackWidget } from "@/lib/feedback/widget-visibility";
import { cn } from "@/lib/utils";

export function SiteFeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (shouldHideFeedbackWidget(pathname)) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-end p-4 sm:p-6">
      <Sheet open={open} onOpenChange={setOpen}>
        {!open ? (
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="pointer-events-auto shadow-[0_22px_50px_-24px_rgba(33,78,121,0.75)]"
              aria-label="Share an idea with Mekor"
            >
              <MessageCircleHeart className="h-5 w-5" />
              Share an idea
            </Button>
          </SheetTrigger>
        ) : null}
        <SheetContent
          className={cn(
            "pointer-events-auto gap-5 overflow-hidden",
            "max-sm:inset-0 max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:border-0",
            "sm:max-w-[28rem]",
          )}
        >
          <SheetHeader>
            <SheetTitle>Share an idea</SheetTitle>
            <SheetDescription>
              We’d love your suggestions — this chat collects feedback with warmth. It doesn’t answer questions or
              search a knowledge base.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <FeedbackChatPanel sourcePath={pathname || "/"} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
