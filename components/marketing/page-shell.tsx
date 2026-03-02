import type { ReactNode } from "react";

import { CTACluster, type CtaItem } from "@/components/marketing/primitives";
import styles from "@/components/marketing/page-shell.module.css";
import { SiteNavigation } from "@/components/navigation/site-navigation";

type ClassValue = string | false | null | undefined;

type MarketingPageShellProps = {
  currentPath: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

type MarketingFooterProps = {
  ctas?: CtaItem[];
};

const DEFAULT_FOOTER_CTAS: CtaItem[] = [
  {
    label: "Latest Newsletters",
    href: "https://us2.campaign-archive.com/home/?u=f9fe87a16c42c24704c099073&id=94f3350887",
    description: "Read the weekly Mekor archive.",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/mekorhabracha/",
    description: "Photos and announcements.",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCfj7vuvPA80HMVN-09ZxOHA",
    description: "Classes, talks, and event videos.",
  },
  {
    label: "Facebook Group",
    href: "https://www.facebook.com/groups/19458667730/?hoisted_section_header_type=recently_seen&multi_permalinks=10160757013487731",
    description: "Community updates and discussion.",
  },
];

function joinClassNames(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}

export function MarketingPageShell({
  currentPath,
  className,
  contentClassName,
  children,
}: MarketingPageShellProps) {
  return (
    <main className={joinClassNames(styles.page, className)} data-native-nav="true">
      <SiteNavigation currentPath={currentPath} />
      <div className={joinClassNames(styles.content, contentClassName)}>{children}</div>
    </main>
  );
}

export function MarketingFooter({ ctas = DEFAULT_FOOTER_CTAS }: MarketingFooterProps) {
  return (
    <footer className={styles.footer}>
      <h2 className={styles.footerTitle}>Mekor Habracha Center City Synagogue</h2>
      <p className={styles.footerContact}>
        <a href="tel:+12155254246">(215) 525-4246</a>
        {" · "}
        <a href="mailto:admin@mekorhabracha.org?subject=Join%20Us">admin@mekorhabracha.org</a>
        <br />
        1500 Walnut St Suite 206, Philadelphia, PA 19102
      </p>
      <CTACluster title="Subscribe To Our Weekly Newsletter" items={ctas} />
      <p className={styles.footerMeta}>Copyright ©2025 by Mekor Habracha Synagogue</p>
    </footer>
  );
}
