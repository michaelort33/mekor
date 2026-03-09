import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import type { CtaItem } from "@/components/marketing/primitives";
import { SiteNavigation } from "@/components/navigation/site-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

type FooterCtaDescriptor = {
  channel: "newsletter" | "instagram" | "youtube" | "facebook" | "default";
  accent: string;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function describeCta(cta: CtaItem): FooterCtaDescriptor {
  const text = `${cta.label} ${cta.href}`.toLowerCase();

  if (text.includes("instagram")) {
    return { channel: "instagram", accent: "#c13584" };
  }

  if (text.includes("youtube")) {
    return { channel: "youtube", accent: "#ff0033" };
  }

  if (text.includes("facebook")) {
    return { channel: "facebook", accent: "#0866ff" };
  }

  if (text.includes("newsletter") || text.includes("campaign-archive")) {
    return { channel: "newsletter", accent: "#2e6ea8" };
  }

  return { channel: "default", accent: "#355f86" };
}

export function MarketingPageShell({
  currentPath,
  className,
  contentClassName,
  children,
}: MarketingPageShellProps) {
  return (
    <main
      className={cn(
        "min-h-screen bg-[radial-gradient(circle_at_top,rgba(225,213,192,0.35),transparent_32%),linear-gradient(180deg,#f8f3eb_0%,#f2ede4_100%)] text-[var(--color-foreground)]",
        className,
      )}
      data-native-nav="true"
    >
      <SiteNavigation currentPath={currentPath} />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] bg-[radial-gradient(circle_at_top_left,rgba(39,72,109,0.18),transparent_58%),radial-gradient(circle_at_top_right,rgba(191,149,92,0.16),transparent_40%)]" />
      <div className={cn("mx-auto flex w-full max-w-[84rem] flex-col gap-8 px-4 pb-20 pt-6 sm:px-6 lg:px-8", contentClassName)}>
        {children}
      </div>
    </main>
  );
}

export function MarketingFooter({ ctas = DEFAULT_FOOTER_CTAS }: MarketingFooterProps) {
  return (
    <footer className="mt-10 pb-8">
      <Card className="overflow-hidden bg-[linear-gradient(145deg,rgba(18,35,59,0.97),rgba(33,58,87,0.95))] text-white">
        <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-10 lg:py-10">
          <section aria-label="Synagogue contact" className="space-y-5">
            <Badge className="border-white/15 bg-white/10 text-[rgba(255,255,255,0.78)]">Center City Synagogue</Badge>
            <div className="space-y-3">
              <h2 className="font-[family-name:var(--font-heading)] text-4xl leading-none tracking-[-0.03em] sm:text-5xl">
                Mekor Habracha
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[rgba(255,255,255,0.76)] sm:text-base">
                A vibrant Modern Orthodox community in the heart of Center City, Philadelphia.
              </p>
            </div>
            <div className="space-y-2 text-sm text-[rgba(255,255,255,0.86)] sm:text-[15px]">
              <p>
                <a href="tel:+12155254246" className="hover:text-white">
                  (215) 525-4246
                </a>
              </p>
              <p>
                <a href="mailto:admin@mekorhabracha.org?subject=Join%20Us" className="hover:text-white">
                  admin@mekorhabracha.org
                </a>
              </p>
              <p>1500 Walnut St Suite 206, Philadelphia, PA 19102</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm">
                <Link href="/donations">Support Mekor</Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-white/25 bg-white/10 hover:bg-white/18"
                style={{ color: "#f8fbff" }}
              >
                <Link href="/visit-us">Plan a Visit</Link>
              </Button>
            </div>
          </section>

          <section aria-label="Community links" className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[rgba(255,255,255,0.55)]">
                  Connect With Mekor
                </p>
                <h3 className="font-[family-name:var(--font-heading)] text-3xl tracking-[-0.03em]">
                  Follow the life of the community
                </h3>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {ctas.map((cta) => {
                const descriptor = describeCta(cta);
                const cardStyle = { "--footer-accent": descriptor.accent } as CSSProperties;
                const external = isExternalHref(cta.href);

                return (
                  <a
                    key={`${cta.href}-${cta.label}`}
                    href={cta.href}
                    style={cardStyle}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer noopener" : undefined}
                    className="group rounded-[26px] border border-white/12 bg-white/6 px-4 py-4 transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <div className="mb-3 h-1.5 w-14 rounded-full bg-[var(--footer-accent)]" />
                    <p className="text-sm font-semibold tracking-[0.02em] text-white">{cta.label}</p>
                    {cta.description ? (
                      <p className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.7)]">{cta.description}</p>
                    ) : null}
                  </a>
                );
              })}
            </div>
          </section>
        </div>
        <Separator className="bg-white/10" />
        <div className="px-6 py-4 text-xs uppercase tracking-[0.2em] text-[rgba(255,255,255,0.52)] sm:px-8 lg:px-10">
          Copyright ©2025 by Mekor Habracha Synagogue
        </div>
      </Card>
    </footer>
  );
}
