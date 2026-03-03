import Link from "next/link";

import styles from "./members-breadcrumbs.module.css";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type MembersBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function MembersBreadcrumbs({ items }: MembersBreadcrumbsProps) {
  return (
    <nav className={styles.wrap} aria-label="Breadcrumb">
      <div className={styles.trail}>
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`}>
            {item.href ? (
              <Link href={item.href} className={styles.crumb}>
                {item.label}
              </Link>
            ) : (
              <span className={styles.crumbCurrent} aria-current="page">
                {item.label}
              </span>
            )}
            {index < items.length - 1 ? <span className={styles.sep}>/</span> : null}
          </span>
        ))}
      </div>

      <div className={styles.actions}>
        <Link href="/" className={styles.home}>
          Site Home
        </Link>
        <Link href="/logout" className={styles.home}>
          Sign out
        </Link>
      </div>
    </nav>
  );
}
