import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-[var(--color-accent)] text-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] hover:bg-[var(--color-accent-strong)]",
  secondary:
    "bg-[var(--color-surface-strong)] text-[var(--color-foreground)] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.35)] hover:bg-[var(--color-surface)]",
  ghost: "bg-transparent text-[var(--color-foreground)] hover:bg-black/5",
  outline:
    "border border-[var(--color-border-strong)] bg-white/70 text-[var(--color-foreground)] hover:bg-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 rounded-full px-5 text-sm",
  sm: "h-9 rounded-full px-4 text-sm",
  lg: "h-12 rounded-full px-6 text-sm",
  icon: "h-11 w-11 rounded-full",
};

export type ButtonProps = (React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>) & {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[0.02em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
