"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DonationCheckoutForm } from "@/components/payments/donation-checkout-form";
import type { PopularWay } from "@/app/donations/popular-ways";
import { cn } from "@/lib/utils";

type DonateExperienceProps = {
  popularWays: PopularWay[];
};

/**
 * Client layer for /donations: popular-way cards and every `#donate` link open
 * the checkout in a modal (pre-configured per card); the same form stays inline
 * as the no-JS fallback; a sticky pill appears once the hero scrolls away.
 */
export function DonateExperience({ popularWays }: DonateExperienceProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PopularWay | null>(null);
  const [heroPassed, setHeroPassed] = useState(false);
  const [inlineVisible, setInlineVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inlineRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const anchor = target?.closest?.('a[href="#donate"]');
      if (!anchor) return;
      event.preventDefault();
      setSelected(null);
      setOpen(true);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const inline = inlineRef.current;
    if (!sentinel || !inline) return;
    const sentinelObserver = new IntersectionObserver(([entry]) => {
      setHeroPassed(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    const inlineObserver = new IntersectionObserver(([entry]) => {
      setInlineVisible(entry.isIntersecting);
    });
    sentinelObserver.observe(sentinel);
    inlineObserver.observe(inline);
    return () => {
      sentinelObserver.disconnect();
      inlineObserver.disconnect();
    };
  }, []);

  function openWay(way: PopularWay) {
    setSelected(way);
    setOpen(true);
  }

  const showSticky = heroPassed && !inlineVisible && !open;

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {popularWays.map((way) => {
          const body = (
            <>
              <span className="text-[15px] font-semibold leading-snug text-[var(--color-foreground)]">{way.label}</span>
              <span className="text-[13px] text-[var(--color-muted)]">{way.note}</span>
              <span className="mt-auto pt-2 text-sm font-semibold text-[var(--color-accent)]">
                {way.href ? "Open sponsorship page →" : "Give this →"}
              </span>
            </>
          );
          const cardClassName =
            "flex min-h-[44px] flex-col gap-1 rounded-[18px] border border-[var(--color-border)] bg-white/80 px-4 py-3.5 text-left shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)] transition hover:border-[var(--color-border-strong)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";
          if (way.href) {
            return (
              <Link key={way.label} href={way.href} prefetch={false} className={cardClassName}>
                {body}
              </Link>
            );
          }
          return (
            <button key={way.label} type="button" onClick={() => openWay(way)} className={cardClassName}>
              {body}
            </button>
          );
        })}
      </div>

      <section id="donate" ref={inlineRef} aria-label="Make a donation" className="scroll-mt-28">
        <DonationCheckoutForm returnPath="/donations" showSuggestedAmounts />
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">Make a donation</DialogTitle>
          <DialogDescription className="sr-only">Choose an amount and continue to secure checkout.</DialogDescription>
          <DonationCheckoutForm
            key={selected?.label ?? "default"}
            frameless
            returnPath="/donations"
            showSuggestedAmounts
            defaultDesignation={selected?.designation ?? "General donation"}
            defaultAmountCents={selected?.amountCents ?? 3600}
            itemName={selected?.label ?? null}
          />
        </DialogContent>
      </Dialog>

      <button
        type="button"
        onClick={() => {
          setSelected(null);
          setOpen(true);
        }}
        className={cn(
          "fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full border border-transparent bg-[linear-gradient(180deg,#2f6fa8_0%,#214e79_100%)] px-5 py-3 text-sm font-semibold !text-[#f8fbff] shadow-[0_18px_45px_-24px_rgba(15,23,42,0.65)] transition hover:!text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
          showSticky ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
        aria-hidden={!showSticky}
        tabIndex={showSticky ? 0 : -1}
      >
        <Heart className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        Donate
      </button>
    </>
  );
}
