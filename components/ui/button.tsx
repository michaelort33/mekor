import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap border border-transparent bg-clip-padding text-sm font-semibold leading-none tracking-[0.02em] transition outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(180deg,#2f6fa8_0%,#214e79_100%)] [color:#f8fbff] shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] hover:bg-[linear-gradient(180deg,#285f90_0%,#1c4368_100%)] hover:[color:#ffffff]",
        secondary:
          "bg-[var(--color-surface-strong)] [color:var(--color-foreground)] shadow-[0_16px_40px_-30px_rgba(15,23,42,0.35)] hover:bg-[var(--color-surface)]",
        ghost: "bg-transparent [color:var(--color-foreground)] hover:bg-black/5",
        outline:
          "border-[var(--color-border-strong)] bg-white/70 [color:var(--color-foreground)] hover:bg-white",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 rounded-full px-5",
        xs: "h-7 gap-1 rounded-full px-2.5 text-xs",
        sm: "h-9 gap-1.5 rounded-full px-4",
        lg: "h-12 gap-2 rounded-full px-6",
        icon: "size-11 rounded-full",
        "icon-xs": "size-7 rounded-full",
        "icon-sm": "size-9 rounded-full",
        "icon-lg": "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
