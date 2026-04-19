"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

import styles from "./modal.module.css";

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      ref.current?.focus();
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const sizeClass = size === "lg" ? styles.lg : size === "xl" ? styles.xl : "";

  return createPortal(
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "bk-modal-title" : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} tabIndex={-1} className={`${styles.modal} ${sizeClass}`}>
        {title || description ? (
          <header className={styles.header}>
            <div>
              {title ? <h2 id="bk-modal-title" className={styles.title}>{title}</h2> : null}
              {description ? <p className={styles.description}>{description}</p> : null}
            </div>
            <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
              ×
            </button>
          </header>
        ) : null}
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="confirm-secondary"
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid var(--bk-border-strong)",
              background: "var(--bk-surface)",
              color: "var(--bk-text-soft)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: `1px solid ${destructive ? "var(--bk-danger)" : "var(--bk-accent-strong)"}`,
              background: destructive ? "var(--bk-danger)" : "var(--bk-accent)",
              color: "var(--bk-text-inverse)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {description}
    </Modal>
  );
}
