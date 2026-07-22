"use client";

import { ChevronDown, Heart, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GIVE_MENU, SUPPORT_MEKOR_LINK } from "@/lib/navigation/site-menu";
import { openUniversalSearch } from "@/components/navigation/universal-search";
import { cn } from "@/lib/utils";

/**
 * Search trigger for the main tier's right corner (option 4a keeps only
 * search and auth in the corners).
 */
export function NavSearchButton() {
  return (
    <button
      type="button"
      aria-label="Search the site"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/60 text-[var(--color-muted)] transition hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      onClick={() => openUniversalSearch()}
    >
      <Search className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/**
 * Donate/Sponsor split-button. Rides the center line directly after the
 * browse menus (option 4a) instead of hugging the right edge.
 */
export function NavGiveButton() {
  const [giveOpen, setGiveOpen] = useState(false);
  const giveRef = useRef<HTMLDivElement | null>(null);
  const giveToggleRef = useRef<HTMLButtonElement | null>(null);
  const giveItemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const closeGiveMenu = (restoreFocus = false) => {
    setGiveOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => giveToggleRef.current?.focus());
    }
  };

  const focusGiveItem = (index: number) => {
    window.requestAnimationFrame(() => giveItemRefs.current[index]?.focus());
  };

  useEffect(() => {
    if (!giveOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (giveRef.current && !giveRef.current.contains(event.target as Node)) {
        setGiveOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setGiveOpen(false);
        window.requestAnimationFrame(() => giveToggleRef.current?.focus());
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [giveOpen]);

  return (
    <div
      ref={giveRef}
      className="relative inline-flex overflow-visible"
      onBlur={(event) => {
        if (!giveRef.current?.contains(event.relatedTarget)) {
          setGiveOpen(false);
        }
      }}
    >
      <span className="inline-flex overflow-hidden rounded-full shadow-[0_18px_45px_-28px_rgba(15,23,42,0.5)]">
        <Button asChild size="sm" className="rounded-none">
          <Link href={SUPPORT_MEKOR_LINK.href} aria-label="Donate to Mekor">
            <Heart className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
            <span>Donate</span>
          </Link>
        </Button>
        <button
          ref={giveToggleRef}
          type="button"
          aria-label="More giving options"
          aria-expanded={giveOpen}
          aria-haspopup="menu"
          aria-controls="native-give-menu"
          className="inline-flex items-center bg-[#1c4368] px-2.5 text-[#cfe0ef] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          style={{ borderLeft: "1px solid rgba(255,255,255,0.18)" }}
          onClick={() => setGiveOpen((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setGiveOpen(true);
              focusGiveItem(0);
            }
          }}
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", giveOpen && "rotate-180")} aria-hidden="true" />
        </button>
      </span>
      {giveOpen ? (
        <div
          id="native-give-menu"
          role="menu"
          className="absolute left-1/2 top-[calc(100%+8px)] z-50 grid w-[240px] -translate-x-1/2 gap-0.5 rounded-[16px] border border-[var(--color-border)] bg-white p-1.5 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]"
        >
          {GIVE_MENU.map((link, index) => (
            <Link
              key={link.label}
              ref={(node) => {
                giveItemRefs.current[index] = node;
              }}
              href={link.href}
              prefetch={false}
              role="menuitem"
              onClick={() => setGiveOpen(false)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusGiveItem((index + 1) % GIVE_MENU.length);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  focusGiveItem((index - 1 + GIVE_MENU.length) % GIVE_MENU.length);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  focusGiveItem(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  focusGiveItem(GIVE_MENU.length - 1);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  closeGiveMenu(true);
                }
              }}
              className="rounded-[10px] px-3 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-strong)]"
            >
              {link.label}
              {link.note ? <span className="block text-xs font-normal text-[var(--color-muted)]">{link.note}</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
