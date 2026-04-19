import type { ReactNode } from "react";

import styles from "./stats.module.css";

export type StatTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export type StatTileProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  delta?: { value: ReactNode; direction: "up" | "down" | "neutral" };
};

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function StatTile({ label, value, hint, tone = "neutral", delta }: StatTileProps) {
  const toneClass = tone === "neutral" ? "" : styles[`tone-${tone}` as keyof typeof styles];
  return (
    <article className={`${styles.tile} ${toneClass}`}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {delta ? (
        <p className={`${styles.delta} ${styles[delta.direction]}`}>
          {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→"} {delta.value}
        </p>
      ) : null}
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </article>
  );
}
