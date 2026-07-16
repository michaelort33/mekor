import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Facebook, Globe2, Linkedin, Podcast, Youtube } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import brandStyles from "@/components/marketing/brand-link.module.css";
import { cn } from "@/lib/utils";

export type LinkBrand = "amazon" | "substack" | "podcast" | "facebook" | "linkedin" | "youtube" | "website";

export type CtaItem = {
  label: string;
  href: string;
  description?: string;
  brand?: LinkBrand;
};

type HeroSectionProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string | string[];
  image?: {
    src: string;
    alt: string;
    objectPosition?: string;
    objectFit?: "cover" | "contain" | "scale-down";
  };
  actions?: CtaItem[];
  tone?: "light" | "dark";
  align?: "left" | "center";
  variant?: "default" | "quiet";
  className?: string;
};

type SplitMediaTextProps = {
  kicker?: string;
  title: string;
  paragraphs: ReactNode[];
  media: {
    src: string;
    alt: string;
    objectPosition?: string;
    objectFit?: "cover" | "contain" | "scale-down";
  };
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

function isHttpLink(href: string) {
  return /^https?:\/\//i.test(href);
}

function RenderLink({
  href,
  className,
  style,
  brand,
  children,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  brand?: LinkBrand;
  children: ReactNode;
}) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} className={className} style={style} data-brand={brand}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      style={style}
      data-brand={brand}
      target={isHttpLink(href) ? "_blank" : undefined}
      rel={isHttpLink(href) ? "noreferrer noopener" : undefined}
    >
      {children}
    </a>
  );
}

export function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  const external = isHttpLink(href);

  return (
    <RenderLink
      href={href}
      className="font-semibold text-[var(--color-accent)] underline decoration-[1.5px] underline-offset-[3px] transition-colors hover:text-[var(--color-accent-strong)]"
    >
      {children}
      {external ? (
        <ExternalLink
          aria-hidden="true"
          className="ml-1 inline h-[0.82em] w-[0.82em] align-[-0.06em]"
          strokeWidth={2.2}
        />
      ) : null}
    </RenderLink>
  );
}

const LINK_BRAND_META: Record<LinkBrand, { label: string; color: string }> = {
  amazon: { label: "Amazon", color: "#d97706" },
  substack: { label: "Substack", color: "#ff6719" },
  podcast: { label: "Podcast", color: "#6d5bd0" },
  facebook: { label: "Facebook", color: "#1877f2" },
  linkedin: { label: "LinkedIn", color: "#0a66c2" },
  youtube: { label: "YouTube", color: "#ff0000" },
  website: { label: "External website", color: "#315f8a" },
};

function AmazonMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M7.1 9.2c.2-2.5 1.8-3.8 4.5-3.8 2.5 0 4 1.1 4 3.2v5.6c0 .8.3 1.5.9 2l-2.1 1.8c-.6-.5-1-1-1.2-1.6-1.1 1.1-2.4 1.7-3.8 1.7-2.1 0-3.5-1.3-3.5-3.3 0-2.3 1.7-3.7 5-4.1l2.2-.3V9.2c0-1.1-.5-1.7-1.6-1.7-1.2 0-1.8.6-2 1.9L7.1 9.2Zm6 3.1-1.8.3c-1.8.3-2.7.9-2.7 1.9 0 .9.6 1.4 1.6 1.4 1.1 0 2.1-.5 2.9-1.5v-2.1Z"
        fill="currentColor"
      />
      <path
        d="M4.2 19.2c4.7 2.6 10.3 2.8 15.3.3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path
        d="m17.6 18.7 2.3.2-.8 2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function SubstackMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M2.2 1h19.6v2.7H2.2V1Zm0 5h19.6v2.7H2.2V6Zm0 5h19.6v12L12 17.3 2.2 23V11Z" fill="currentColor" />
    </svg>
  );
}

function LinkBrandMark({ brand }: { brand: LinkBrand }) {
  switch (brand) {
    case "amazon":
      return <AmazonMark />;
    case "substack":
      return <SubstackMark />;
    case "podcast":
      return <Podcast aria-hidden="true" />;
    case "facebook":
      return <Facebook aria-hidden="true" />;
    case "linkedin":
      return <Linkedin aria-hidden="true" />;
    case "youtube":
      return <Youtube aria-hidden="true" />;
    case "website":
      return <Globe2 aria-hidden="true" />;
  }
}

type BrandedLinkProps = CtaItem & {
  className?: string;
  compact?: boolean;
};

export function BrandedLink({ label, href, description, brand, className, compact = false }: BrandedLinkProps) {
  const external = isHttpLink(href);
  const effectiveBrand = brand ?? (external ? "website" : undefined);
  const meta = effectiveBrand ? LINK_BRAND_META[effectiveBrand] : undefined;
  const style = meta ? ({ "--link-brand": meta.color } as CSSProperties) : undefined;

  return (
    <RenderLink
      href={href}
      brand={effectiveBrand}
      style={style}
      className={cn(
        brandStyles.link,
        compact && brandStyles.compact,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
        className,
      )}
    >
      <span className={brandStyles.inner}>
        {effectiveBrand ? (
          <span className={brandStyles.icon} aria-hidden="true">
            <LinkBrandMark brand={effectiveBrand} />
          </span>
        ) : null}
        <span className={brandStyles.copy}>
          <span className={brandStyles.label}>{label}</span>
          {meta ? <span className={brandStyles.destination}>{meta.label}</span> : null}
          {description ? <span className={brandStyles.description}>{description}</span> : null}
        </span>
        {external ? <ExternalLink aria-hidden="true" className={brandStyles.external} strokeWidth={2.2} /> : null}
      </span>
    </RenderLink>
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
  variant = "default",
  className,
}: HeroSectionProps) {
  const lines = Array.isArray(description) ? description : description ? [description] : [];

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-[40px] border border-[var(--color-border)] px-6 py-8 shadow-[0_42px_100px_-60px_rgba(15,23,42,0.5)] sm:px-8 sm:py-10 lg:px-12 lg:py-14",
        tone === "dark"
          ? "bg-[linear-gradient(140deg,rgba(18,35,59,0.94),rgba(44,71,102,0.88))] text-white"
          : "bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(250,245,238,0.93))] text-[var(--color-foreground)]",
        align === "center" && "text-center",
        variant === "quiet" && "min-h-[30rem] sm:min-h-[34rem]",
        className,
      )}
    >
      {image ? (
        <div className="absolute inset-0">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority
            sizes="100vw"
            style={{
              objectPosition: image.objectPosition,
              objectFit: image.objectFit,
            }}
            className={cn("scale-[1.02]", tone === "dark" ? "opacity-40" : "opacity-20")}
          />
        </div>
      ) : null}
      <div
        className={cn(
          "absolute inset-0",
          tone === "dark"
            ? "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_34%),linear-gradient(180deg,rgba(8,16,29,0.05),rgba(8,16,29,0.26))]"
            : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.66),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.52),rgba(248,243,235,0.82))]",
        )}
      />
      <div
        className={cn(
          "relative z-10 flex max-w-3xl flex-col gap-5",
          align === "center" && "mx-auto items-center",
        )}
      >
        {eyebrow ? (
          <Badge
            className={cn(
              align === "center" ? "self-center" : "self-start",
              tone === "dark" ? "border-white/14 bg-white/10 text-[rgba(255,255,255,0.75)]" : "",
            )}
          >
            {eyebrow}
          </Badge>
        ) : null}
        <div className="space-y-4">
          <h1 className="font-[family-name:var(--font-heading)] text-5xl leading-[0.92] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          <span
            aria-hidden
            className={cn(
              "block h-[3px] w-12 rounded-full",
              tone === "dark" ? "bg-white/45" : "bg-[color-mix(in_srgb,var(--color-accent)_65%,transparent)]",
            )}
          />
          {subtitle ? (
            <p className={cn("text-lg font-medium tracking-[0.04em] sm:text-xl", tone === "dark" ? "text-[rgba(255,255,255,0.75)]" : "text-[var(--color-muted)]")}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {lines.length > 0 ? (
          <div className="space-y-3">
            {lines.map((line) => (
              <p
                key={line}
                className={cn(
                  "max-w-2xl text-base leading-7 sm:text-lg sm:leading-8",
                  tone === "dark" ? "text-[rgba(255,255,255,0.82)]" : "text-[var(--color-muted)]",
                )}
              >
                {line}
              </p>
            ))}
          </div>
        ) : null}
        {actions?.length ? (
          <div className={cn("flex flex-wrap gap-3", align === "center" && "justify-center")}>
            {actions.map((action, index) => (
              <Button
                key={`${action.href}-${action.label}`}
                asChild
                variant={index === 0 ? "default" : tone === "dark" ? "outline" : "secondary"}
                className={cn(
                  tone === "dark" && index !== 0 && "border-white/20 bg-white/10 hover:bg-white/18",
                )}
                style={tone === "dark" && index !== 0 ? { color: "#f8fbff" } : undefined}
              >
                <RenderLink href={action.href}>{action.label}</RenderLink>
              </Button>
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
  reverse = false,
  className,
}: SplitMediaTextProps) {
  return (
    <article className={cn("grid gap-6 lg:grid-cols-2 lg:gap-8 [&>*]:min-w-0", reverse && "lg:[&>*:first-child]:order-2", className)}>
      <div className="relative overflow-hidden rounded-[30px] bg-[var(--color-surface-soft)]">
        <Image
          src={media.src}
          alt={media.alt}
          width={1200}
          height={960}
          sizes="(max-width: 900px) 100vw, 50vw"
          style={{
            objectPosition: media.objectPosition,
            objectFit: media.objectFit,
          }}
          className="h-full min-h-[20rem] w-full object-cover"
        />
      </div>
      <div className="flex flex-col justify-center gap-5">
        {kicker ? <Badge className="self-start">{kicker}</Badge> : null}
        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.03em] text-[var(--color-foreground)] sm:text-5xl">
            {title}
          </h2>
          <span aria-hidden className="block h-[2px] w-9 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_60%,transparent)]" />
        </div>
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => (
            <p key={`${title}-${index}`} className="text-base leading-7 text-[var(--color-muted)] sm:text-lg sm:leading-8">
              {paragraph}
            </p>
          ))}
        </div>
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
    <Card
      className={cn(
        "px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8",
        tone === "dark" && "bg-[linear-gradient(145deg,rgba(18,35,59,0.98),rgba(40,66,95,0.96))] text-white",
        tone === "blue" && "bg-[linear-gradient(145deg,rgba(235,241,247,0.94),rgba(221,232,242,0.98))]",
        className,
      )}
    >
      {(title || description) ? (
        <CardHeader className="mb-6">
          {title ? (
            <CardTitle className={cn(tone === "dark" ? "text-white" : "")}>{title}</CardTitle>
          ) : null}
          {title ? (
            <span
              aria-hidden
              className={cn(
                "-mt-1 h-[2px] w-9 rounded-full",
                tone === "dark" ? "bg-white/40" : "bg-[color-mix(in_srgb,var(--color-accent)_60%,transparent)]",
              )}
            />
          ) : null}
          {description ? (
            <CardDescription className={cn(tone === "dark" ? "text-[rgba(255,255,255,0.72)]" : "")}>
              {description}
            </CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function CTACluster({ title, items, className }: CTAClusterProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {title ? (
        <div className="space-y-2.5">
          <h3 className="font-[family-name:var(--font-heading)] text-2xl tracking-[-0.02em] text-[var(--color-foreground)]">
            {title}
          </h3>
          <span aria-hidden className="block h-[2px] w-8 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_55%,transparent)]" />
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <BrandedLink
            key={`${item.href}-${item.label}`}
            {...item}
          />
        ))}
      </div>
    </section>
  );
}
