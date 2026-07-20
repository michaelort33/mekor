"use client";

import { ChevronDown, Heart, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GIVE_MENU, JOIN_US_LINK, SUPPORT_MEKOR_LINK } from "@/lib/navigation/site-menu";
import { openUniversalSearch } from "@/components/navigation/universal-search";
import { cn } from "@/lib/utils";

type NavCtaProps = {
  isSignedIn: boolean;
  isCheckingAuth: boolean;
};

/**
 * Desktop right-hand cluster: search icon (demoted) · WhatsApp pill (promoted)
 * · Donate split-button with GIVE_MENU dropdown · Sign In / Dashboard.
 */
export function NavCta({ isSignedIn, isCheckingAuth }: NavCtaProps) {
  const [giveOpen, setGiveOpen] = useState(false);
  const giveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!giveOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (giveRef.current && !giveRef.current.contains(event.target as Node)) {
        setGiveOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setGiveOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [giveOpen]);

  const authAction = isCheckingAuth
    ? { label: "Checking…", href: "/login?next=%2Fmembers" }
    : isSignedIn
      ? { label: "Dashboard", href: "/account" }
      : { label: "Sign In", href: "/login?next=%2Fmembers" };

  return (
    <div className="flex flex-none items-center gap-1.5 whitespace-nowrap">
      <button
        type="button"
        aria-label="Search the site"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/60 text-[var(--color-muted)] transition hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        onClick={() => openUniversalSearch()}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>

      <a
        href={JOIN_US_LINK.href}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-2 rounded-full border border-[#c4dcc9] bg-[#e7f2e9] px-3.5 py-2 text-sm font-semibold text-[#1e5c3d] transition hover:border-[#8fbf9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        <span className="h-2 w-2 rounded-full bg-[#2e9e5b]" aria-hidden="true" />
        Join WhatsApp
      </a>

      <div ref={giveRef} className="relative inline-flex overflow-visible">
        <span className="inline-flex overflow-hidden rounded-full shadow-[0_18px_45px_-28px_rgba(15,23,42,0.5)]">
          <Button asChild size="sm" className="rounded-none">
            <Link href={SUPPORT_MEKOR_LINK.href} aria-label="Donate to Mekor">
              <Heart className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
              <span>Donate</span>
            </Link>
          </Button>
          <button
            type="button"
            aria-label="More giving options"
            aria-expanded={giveOpen}
            aria-haspopup="menu"
            className="inline-flex items-center bg-[#1c4368] px-2.5 text-[#cfe0ef] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.18)" }}
            onClick={() => setGiveOpen((open) => !open)}
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", giveOpen && "rotate-180")} aria-hidden="true" />
          </button>
        </span>
        {giveOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+8px)] z-50 grid w-[240px] gap-0.5 rounded-[16px] border border-[var(--color-border)] bg-white p-1.5 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]"
          >
            {GIVE_MENU.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                prefetch={false}
                role="menuitem"
                onClick={() => setGiveOpen(false)}
                className="rounded-[10px] px-3 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-strong)]"
              >
                {link.label}
                {link.note ? <span className="block text-xs font-normal text-[var(--color-muted)]">{link.note}</span> : null}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <Button asChild size="sm" variant="ghost" className="bg-white/60 hover:bg-white">
        <Link href={authAction.href}>
          <span>{authAction.label}</span>
        </Link>
      </Button>
      {isSignedIn && !isCheckingAuth ? (
        <Button asChild size="sm" variant="ghost">
          <Link href="/logout">
            <span>Sign Out</span>
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
