import Link from "next/link";

import styles from "./admin-tabs.module.css";

type AdminTabsProps = {
  current: "operations" | "templates";
};

export function AdminTabs({ current }: AdminTabsProps) {
  return (
    <nav className={styles.tabs} aria-label="Admin navigation tabs">
      <Link href="/admin/operations" className={`${styles.tab}${current === "operations" ? ` ${styles.tabActive}` : ""}`}>
        Operations
      </Link>
      <Link href="/admin/templates" className={`${styles.tab}${current === "templates" ? ` ${styles.tabActive}` : ""}`}>
        Templates
      </Link>
    </nav>
  );
}
