import type { ReactNode } from "react";

import styles from "./badge.module.css";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export function Badge({
  tone = "neutral",
  dot,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
