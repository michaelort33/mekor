"use client";

import { forwardRef, useId } from "react";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import styles from "./field.module.css";

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: (controlProps: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
  className?: string;
} & Omit<LabelHTMLAttributes<HTMLLabelElement>, "children">;

export function Field({
  label,
  hint,
  error,
  required,
  optional,
  children,
  className,
  ...rest
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`${styles.field} ${className ?? ""}`}>
      <label htmlFor={id} className={`${styles.label} ${required ? styles.required : ""}`} {...rest}>
        {label}
        {optional ? <span className={styles.optional}>Optional</span> : null}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error) || undefined,
        "aria-describedby": describedBy,
      })}
      {hint && !error ? <p id={hintId} className={styles.hint}>{hint}</p> : null}
      {error ? <p id={errorId} className={styles.errorText} role="alert">{error}</p> : null}
    </div>
  );
}

export function FieldRow({
  cols = 1,
  children,
}: {
  cols?: 1 | 2 | 3;
  children: ReactNode;
}) {
  const colsClass = cols === 2 ? styles.cols2 : cols === 3 ? styles.cols3 : "";
  return <div className={`${styles.row} ${colsClass}`}>{children}</div>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = "text", ...rest }, ref) {
    return <input ref={ref} type={type} className={`${styles.control} ${className ?? ""}`} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={`${styles.textarea} ${className ?? ""}`} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={`${styles.select} ${className ?? ""}`} {...rest}>
        {children}
      </select>
    );
  },
);

export const Checkbox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }
>(function Checkbox({ label, ...rest }, ref) {
  if (!label) return <input ref={ref} type="checkbox" className={styles.checkbox} {...rest} />;
  return (
    <label className={styles.checkboxRow}>
      <input ref={ref} type="checkbox" className={styles.checkbox} {...rest} />
      <span>{label}</span>
    </label>
  );
});

export function Radio({
  label,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  if (!label) return <input type="radio" className={styles.radio} {...rest} />;
  return (
    <label className={styles.radioRow}>
      <input type="radio" className={styles.radio} {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function Toggle({
  label,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  if (!label) return <input type="checkbox" role="switch" className={styles.toggle} {...rest} />;
  return (
    <label className={styles.checkboxRow}>
      <input type="checkbox" role="switch" className={styles.toggle} {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function InputAddon({
  leading,
  trailing,
  children,
}: {
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.inputAddon}>
      {leading ? <span className={styles.leading}>{leading}</span> : null}
      {children}
      {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
    </div>
  );
}
