import type { CSSProperties, ReactNode } from "react";

import type { CtaItem } from "@/components/marketing/primitives";
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

type FooterCtaDescriptor = {
  channel: "newsletter" | "instagram" | "youtube" | "facebook" | "default";
  accent: string;
  icon: ReactNode;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function iconNewsletter() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2 .65v9.85c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75V7.4l-6.5 4.67a.99.99 0 0 1-1.16 0L5 7.4Zm12.99-1.4H6.01L12 10.31 17.99 6Z" />
    </svg>
  );
}

function iconInstagram() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.08 3h7.84A5.08 5.08 0 0 1 21 8.08v7.84A5.08 5.08 0 0 1 15.92 21H8.08A5.08 5.08 0 0 1 3 15.92V8.08A5.08 5.08 0 0 1 8.08 3Zm0 2A3.08 3.08 0 0 0 5 8.08v7.84A3.08 3.08 0 0 0 8.08 19h7.84A3.08 3.08 0 0 0 19 15.92V8.08A3.08 3.08 0 0 0 15.92 5H8.08Zm8.1 1.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7.2A4.8 4.8 0 1 1 7.2 12 4.81 4.81 0 0 1 12 7.2Zm0 2A2.8 2.8 0 1 0 14.8 12 2.8 2.8 0 0 0 12 9.2Z" />
    </svg>
  );
}

function iconYoutube() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.68 7.37a2.73 2.73 0 0 0-1.93-1.93C17.04 5 12 5 12 5s-5.04 0-6.75.44a2.73 2.73 0 0 0-1.93 1.93C2.88 9.08 2.88 12 2.88 12s0 2.92.44 4.63a2.73 2.73 0 0 0 1.93 1.93C6.96 19 12 19 12 19s5.04 0 6.75-.44a2.73 2.73 0 0 0 1.93-1.93c.44-1.71.44-4.63.44-4.63s0-2.92-.44-4.63ZM10.4 15.1V8.9L15.6 12l-5.2 3.1Z" />
    </svg>
  );
}

function iconFacebook() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2a10 10 0 1 0 0 20 10.03 10.03 0 0 0 1-.05v-7.02h2.21l.42-2.72H13v-1.77c0-.74.36-1.47 1.52-1.47h1.17V6.65a14.2 14.2 0 0 0-2.07-.18c-2.12 0-3.5 1.28-3.5 3.6v2.14H7.76v2.72h2.36v6.61A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function describeCta(cta: CtaItem): FooterCtaDescriptor {
  const text = `${cta.label} ${cta.href}`.toLowerCase();

  if (text.includes("instagram")) {
    return { channel: "instagram", accent: "#c13584", icon: iconInstagram() };
  }

  if (text.includes("youtube")) {
    return { channel: "youtube", accent: "#ff0033", icon: iconYoutube() };
  }

  if (text.includes("facebook")) {
    return { channel: "facebook", accent: "#0866ff", icon: iconFacebook() };
  }

  if (text.includes("newsletter") || text.includes("campaign-archive")) {
    return { channel: "newsletter", accent: "#2e6ea8", icon: iconNewsletter() };
  }

  return { channel: "default", accent: "#355f86", icon: iconNewsletter() };
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
      <div className={styles.footerGrid}>
        <section className={styles.footerIntro} aria-label="Synagogue contact">
          <h2 className={styles.footerTitle}>Mekor Habracha Center City Synagogue</h2>
          <p className={styles.footerContact}>
            <a href="tel:+12155254246">(215) 525-4246</a>
            {" · "}
            <a href="mailto:admin@mekorhabracha.org?subject=Join%20Us">admin@mekorhabracha.org</a>
          </p>
          <p className={styles.footerAddress}>1500 Walnut St Suite 206, Philadelphia, PA 19102</p>
        </section>

        <section className={styles.footerLinks} aria-label="Community links">
          <h3 className={styles.footerLinksTitle}>Connect With Mekor</h3>
          <ul className={styles.footerCtaList}>
            {ctas.map((cta) => {
              const descriptor = describeCta(cta);
              const cardStyle = { "--footer-accent": descriptor.accent } as CSSProperties;
              const external = isExternalHref(cta.href);

              return (
                <li key={`${cta.href}-${cta.label}`}>
                  <a
                    href={cta.href}
                    className={joinClassNames(styles.footerCta, styles[`footerCta--${descriptor.channel}`])}
                    style={cardStyle}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer noopener" : undefined}
                  >
                    <span className={styles.footerCtaIcon} aria-hidden="true">
                      {descriptor.icon}
                    </span>
                    <span className={styles.footerCtaBody}>
                      <span className={styles.footerCtaLabel}>{cta.label}</span>
                      {cta.description ? <span className={styles.footerCtaDescription}>{cta.description}</span> : null}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <p className={styles.footerMeta}>Copyright ©2025 by Mekor Habracha Synagogue</p>
    </footer>
  );
}
