import type { ReactNode } from "react";
import Link from "next/link";

import styles from "@/components/marketing/primitives.module.css";

export type CtaItem = {
  label: string;
  href: string;
  description?: string;
};

type ClassValue = string | false | null | undefined;

type HeroSectionProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string | string[];
  image?: {
    src: string;
    alt: string;
    objectPosition?: string;
  };
  actions?: CtaItem[];
  tone?: "light" | "dark";
  align?: "left" | "center";
  className?: string;
};

type SplitMediaTextProps = {
  kicker?: string;
  title: string;
  paragraphs: string[];
  media: {
    src: string;
    alt: string;
    objectPosition?: string;
  };
  links?: CtaItem[];
  reverse?: boolean;
  className?: string;
};

type SectionCardProps = {
  title?: string;
  description?: string;
  tone?: "light" | "dark" | "blue";
  className?: string;
  children?: ReactNode;
};

type CTAClusterProps = {
  title?: string;
  items: CtaItem[];
  className?: string;
};

function joinClassNames(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}

function isHttpLink(href: string) {
  return /^https?:\/\//i.test(href);
}

function RenderLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      target={isHttpLink(href) ? "_blank" : undefined}
      rel={isHttpLink(href) ? "noreferrer noopener" : undefined}
    >
      {children}
    </a>
  );
}

export function HeroSection({
  eyebrow,
  title,
  subtitle,
  description,
  image,
  actions,
  tone = "light",
  align = "left",
  className,
}: HeroSectionProps) {
  const lines = Array.isArray(description) ? description : description ? [description] : [];

  return (
    <section
      className={joinClassNames(
        styles.hero,
        tone === "dark" && styles.heroDark,
        align === "center" && styles.heroCenter,
        className,
      )}
    >
      {image ? (
        <div className={styles.heroMedia}>
          <img src={image.src} alt={image.alt} style={{ objectPosition: image.objectPosition }} />
        </div>
      ) : null}
      <div className={styles.heroOverlay} />
      <div className={styles.heroContent}>
        {eyebrow ? <p className={styles.heroEyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.heroTitle}>{title}</h1>
        {subtitle ? <p className={styles.heroSubtitle}>{subtitle}</p> : null}
        {lines.map((line) => (
          <p key={line} className={styles.heroDescription}>
            {line}
          </p>
        ))}
        {actions?.length ? (
          <div className={styles.heroActions}>
            {actions.map((action) => (
              <RenderLink key={`${action.href}-${action.label}`} href={action.href} className={styles.heroAction}>
                {action.label}
              </RenderLink>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function SplitMediaText({
  kicker,
  title,
  paragraphs,
  media,
  links,
  reverse = false,
  className,
}: SplitMediaTextProps) {
  return (
    <article className={joinClassNames(styles.split, reverse && styles.splitReverse, className)}>
      <div className={styles.splitMedia}>
        <img src={media.src} alt={media.alt} style={{ objectPosition: media.objectPosition }} />
      </div>
      <div className={styles.splitBody}>
        {kicker ? <p className={styles.splitKicker}>{kicker}</p> : null}
        <h2 className={styles.splitTitle}>{title}</h2>
        {paragraphs.map((paragraph) => (
          <p key={`${title}-${paragraph}`} className={styles.splitParagraph}>
            {paragraph}
          </p>
        ))}
        {links?.length ? (
          <div className={styles.splitLinks}>
            {links.map((link) => (
              <RenderLink key={`${link.href}-${link.label}`} href={link.href} className={styles.splitLink}>
                {link.label}
              </RenderLink>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function SectionCard({
  title,
  description,
  tone = "light",
  className,
  children,
}: SectionCardProps) {
  return (
    <section
      className={joinClassNames(
        styles.sectionCard,
        tone === "dark" && styles.sectionCardDark,
        tone === "blue" && styles.sectionCardBlue,
        className,
      )}
    >
      {title ? <h2 className={styles.sectionCardHeading}>{title}</h2> : null}
      {description ? <p className={styles.sectionCardDescription}>{description}</p> : null}
      {children}
    </section>
  );
}

export function CTACluster({ title, items, className }: CTAClusterProps) {
  return (
    <section className={joinClassNames(styles.ctaCluster, className)}>
      {title ? <h3 className={styles.ctaClusterTitle}>{title}</h3> : null}
      <ul className={styles.ctaList}>
        {items.map((item) => (
          <li key={`${item.href}-${item.label}`}>
            <RenderLink href={item.href} className={styles.ctaItem}>
              <span className={styles.ctaLabel}>{item.label}</span>
              {item.description ? <span className={styles.ctaDescription}>{item.description}</span> : null}
            </RenderLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
