import * as React from "react";

import { cn } from "@/lib/utils";

export const inputClassName =
  "flex h-12 w-full rounded-[22px] border border-[var(--color-border-strong)] bg-white/85 px-4 text-[15px] text-[var(--color-foreground)] shadow-[0_15px_35px_-30px_rgba(15,23,42,0.5)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-ring)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-ring)_14%,transparent)]";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Input(
  { className, type, ...props },
  ref,
) {
  return <input ref={ref} type={type} className={cn(inputClassName, className)} {...props} />;
});
