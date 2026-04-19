import type { HTMLAttributes, ReactNode } from "react";

import styles from "./card.module.css";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  flat?: boolean;
  padded?: boolean;
};

export function Card({ flat, padded, className, children, ...rest }: CardProps) {
  const cls = [styles.card, flat ? styles.flat : "", padded ? styles.padded : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div>
        <h2 className={styles.headerTitle}>{title}</h2>
        {description ? <p className={styles.headerDescription}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  );
}

export function CardBody({
  children,
  dense,
  className,
}: {
  children: ReactNode;
  dense?: boolean;
  className?: string;
}) {
  return <div className={`${styles.body} ${dense ? styles.dense : ""} ${className ?? ""}`}>{children}</div>;
}

export function CardFooter({ children }: { children: ReactNode }) {
  return <footer className={styles.footer}>{children}</footer>;
}
