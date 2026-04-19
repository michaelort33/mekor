"use client";

import Link from "next/link";
import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./button.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "dangerGhost"
  | "success"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
  className?: string;
};

function classes({
  variant = "secondary",
  size = "md",
  fullWidth,
  iconOnly,
  className,
}: CommonProps) {
  return [
    styles.btn,
    styles[variant],
    styles[size],
    iconOnly ? styles.iconOnly : "",
    fullWidth ? styles.fullWidth : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & CommonProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    fullWidth,
    iconOnly,
    leadingIcon,
    trailingIcon,
    loading,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, fullWidth, iconOnly, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
});

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  CommonProps & { href: string; external?: boolean };

export function LinkButton({
  variant,
  size,
  fullWidth,
  iconOnly,
  leadingIcon,
  trailingIcon,
  className,
  children,
  href,
  external,
  ...rest
}: LinkButtonProps) {
  const cls = classes({ variant, size, fullWidth, iconOnly, className });

  if (external || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return (
      <a
        href={href}
        className={cls}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer noopener" : undefined}
        {...rest}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </a>
    );
  }

  return (
    <Link href={href} className={cls} {...(rest as Record<string, unknown>)}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </Link>
  );
}
