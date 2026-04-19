"use client";

import type { ChangeEvent, ReactNode } from "react";

import styles from "./toolbar.module.css";

export function Toolbar({
  embedded,
  children,
}: {
  embedded?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.toolbar} ${embedded ? styles.embedded : ""}`}>
      {children}
    </div>
  );
}

export function ToolbarSearch({
  value,
  onChange,
  placeholder = "Search…",
  ariaLabel = "Search",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={styles.search}>
      <span className={styles.searchIcon} aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={styles.searchInput}
      />
    </div>
  );
}

export function ToolbarFilters({ children }: { children: ReactNode }) {
  return <div className={styles.filters}>{children}</div>;
}

export function ToolbarActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export function ToolbarDivider() {
  return <span className={styles.divider} aria-hidden="true" />;
}

export function FilterChip({
  label,
  onRemove,
}: {
  label: ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span className={styles.chip}>
      {label}
      {onRemove ? (
        <button type="button" onClick={onRemove} className={styles.chipClose} aria-label="Remove filter">
          ×
        </button>
      ) : null}
    </span>
  );
}
