"use client";

import type { ReactNode } from "react";

import styles from "./tabs.module.css";

export type TabItem<T extends string = string> = {
  value: T;
  label: ReactNode;
  count?: number | string;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel = "Tabs",
}: {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={styles.tabs}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.tab} ${active ? styles.tabActive : ""}`}
            onClick={() => onChange(item.value)}
          >
            {item.label}
            {item.count !== undefined ? <span className={styles.tabCount}>{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
