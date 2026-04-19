import type { CSSProperties, ReactNode } from "react";

import styles from "./feedback.module.css";

type Variant = "text" | "line" | "heading" | "avatar" | "chip" | "card";

export function Skeleton({
  variant = "line",
  width,
  height,
  className,
  style,
}: {
  variant?: Variant;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  const variantClass =
    variant === "text"
      ? styles.skeletonText
      : variant === "heading"
        ? styles.skeletonHeading
        : variant === "avatar"
          ? styles.skeletonAvatar
          : variant === "chip"
            ? styles.skeletonChip
            : variant === "card"
              ? styles.skeletonCard
              : styles.skeletonLine;
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={`${styles.skeleton} ${variantClass} ${className ?? ""}`}
      style={{ width, height, ...style }}
    />
  );
}

export function SkeletonStack({ rows = 3, gap = 12 }: { rows?: number; gap?: number }) {
  return (
    <div style={{ display: "grid", gap }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} variant="line" width={`${60 + Math.random() * 40}%`} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      {icon ? <div className={styles.emptyIcon}>{icon}</div> : null}
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description ? <p className={styles.emptyDescription}>{description}</p> : null}
      {actions ? <div className={styles.emptyActions}>{actions}</div> : null}
    </div>
  );
}

export type AlertTone = "success" | "warning" | "danger" | "info";

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? styles.alertSuccess
      : tone === "warning"
        ? styles.alertWarning
        : tone === "danger"
          ? styles.alertDanger
          : styles.alertInfo;
  return (
    <div className={`${styles.alert} ${toneClass}`} role="status">
      <div className={styles.alertBody}>
        {title ? <p className={styles.alertTitle}>{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function Spinner({ size = "sm", inline }: { size?: "sm" | "lg"; inline?: boolean }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`${styles.spinner} ${size === "lg" ? styles.spinnerLg : ""} ${
        inline ? styles.spinnerInline : ""
      }`}
    />
  );
}

export function LoadingOverlay({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.overlay}>
      {children}
      {active ? (
        <div className={styles.overlayBlock}>
          <Spinner size="lg" />
        </div>
      ) : null}
    </div>
  );
}
