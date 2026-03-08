import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CtaItem = {
  label: string;
  href: string;
  description?: string;
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
  paragraphs: string[];
  media: {
    src: string;
    alt: string;
    objectPosition?: string;
    objectFit?: "cover" | "contain" | "scale-down";
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
          <Badge className={cn(tone === "dark" ? "border-white/14 bg-white/10 text-[rgba(255,255,255,0.75)]" : "")}>
            {eyebrow}
          </Badge>
        ) : null}
        <div className="space-y-3">
          <h1 className="font-[family-name:var(--font-heading)] text-5xl leading-[0.92] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            {title}
          </h1>
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
                  tone === "dark" && index !== 0 && "border-white/20 bg-white/10 text-white hover:bg-white/18",
                )}
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
  links,
  reverse = false,
  className,
}: SplitMediaTextProps) {
  return (
    <article className={cn("grid gap-6 lg:grid-cols-2 lg:gap-8", reverse && "lg:[&>*:first-child]:order-2", className)}>
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
        {kicker ? <Badge>{kicker}</Badge> : null}
        <h2 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.03em] text-[var(--color-foreground)] sm:text-5xl">
          {title}
        </h2>
        <div className="space-y-4">
          {paragraphs.map((paragraph) => (
            <p key={`${title}-${paragraph}`} className="text-base leading-7 text-[var(--color-muted)] sm:text-lg sm:leading-8">
              {paragraph}
            </p>
          ))}
        </div>
        {links?.length ? (
          <div className="flex flex-wrap gap-3">
            {links.map((link, index) => (
              <Button key={`${link.href}-${link.label}`} asChild variant={index === 0 ? "default" : "ghost"}>
                <RenderLink href={link.href}>{link.label}</RenderLink>
              </Button>
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
        <h3 className="font-[family-name:var(--font-heading)] text-2xl tracking-[-0.02em] text-[var(--color-foreground)]">
          {title}
        </h3>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <RenderLink
            key={`${item.href}-${item.label}`}
            href={item.href}
            className="group rounded-[24px] border border-[var(--color-border)] bg-white/80 px-4 py-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:bg-white"
          >
            <span className="block text-sm font-semibold tracking-[0.02em] text-[var(--color-foreground)]">
              {item.label}
            </span>
            {item.description ? (
              <span className="mt-2 block text-sm leading-6 text-[var(--color-muted)]">{item.description}</span>
            ) : null}
          </RenderLink>
        ))}
      </div>
    </section>
  );
}
