import * as React from "react";

import { cn } from "@/lib/utils";

export const textareaClassName =
  "flex min-h-[140px] w-full rounded-[22px] border border-[var(--color-border-strong)] bg-white/85 px-4 py-3 text-[15px] text-[var(--color-foreground)] shadow-[0_15px_35px_-30px_rgba(15,23,42,0.5)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-ring)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-ring)_14%,transparent)]";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(textareaClassName, className)} {...props} />;
});
