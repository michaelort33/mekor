"use client";

import { ChevronDown, Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { isNavigationPathActive } from "@/lib/navigation/path";
import { NavBrand } from "@/components/navigation/nav-brand";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  GIVE_MENU,
  JOIN_US_LINK,
  KIDDUSH_LINK,
  MEMBERS_MENU,
  MOBILE_GROUPS,
  QUICK_TILES,
  SUPPORT_MEKOR_LINK,
} from "@/lib/navigation/site-menu";
import { cn } from "@/lib/utils";
import { openUniversalSearch } from "@/components/navigation/universal-search";

type MobileDrawerProps = {
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
  drawerId: string;
  authenticated: boolean;
  isCheckingAuth: boolean;
};

function getGroupId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const sponsorKiddush = GIVE_MENU.find((link) => link.href === KIDDUSH_LINK.href);

export function MobileDrawer({
  currentPath,
  isOpen,
  onClose,
  drawerId,
  authenticated,
  isCheckingAuth,
}: MobileDrawerProps) {
  const initialExpanded = useMemo(() => {
    for (const group of MOBILE_GROUPS) {
      if (
        isNavigationPathActive(currentPath, group.href) ||
        group.children.some((child) => isNavigationPathActive(currentPath, child.href))
      ) {
        return getGroupId(group.label);
      }
    }
    return null;
  }, [currentPath]);

  const [expandedId, setExpandedId] = useState<string | null>(initialExpanded);
  useEffect(() => {
    setExpandedId(initialExpanded);
  }, [initialExpanded]);

  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove("native-nav--mobile-open");
      return;
    }
    document.body.classList.add("native-nav--mobile-open");
    return () => {
      document.body.classList.remove("native-nav--mobile-open");
    };
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent id={drawerId} className="gap-4">
        <SheetHeader>
          <div className="flex items-center justify-between gap-4 pr-10">
            <NavBrand />
          </div>
          <SheetTitle className="sr-only">Browse Mekor</SheetTitle>
          <SheetDescription className="sr-only">Site menu</SheetDescription>
        </SheetHeader>

        <nav className="mt-2 flex-1 overflow-y-auto" aria-label="Mobile site menu">
          {/* Quick tiles — top priorities, always one tap away */}
          <div className="grid grid-cols-2 gap-2">
            {QUICK_TILES.map((tile) => (
              <Link
                key={tile.label}
                href={tile.href}
                prefetch={false}
                onClick={onClose}
                aria-current={isNavigationPathActive(currentPath, tile.href) ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] flex-col gap-0.5 rounded-[16px] border border-[var(--color-border)] bg-white/80 px-3.5 py-3 transition hover:border-[var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                  isNavigationPathActive(currentPath, tile.href) &&
                    "border-[var(--color-border-strong)] bg-[var(--color-surface-strong)]",
                )}
              >
                <span className="text-[15px] font-semibold text-[var(--color-foreground)]">{tile.label}</span>
                <span className="text-[11.5px] text-[var(--color-muted)]">{tile.note}</span>
              </Link>
            ))}
          </div>

          {/* Give card — Donate + Sponsor a Kiddush */}
          <div className="mt-3 overflow-hidden rounded-[18px] shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)]">
            <Link
              href={SUPPORT_MEKOR_LINK.href}
              prefetch={false}
              onClick={onClose}
              className="flex items-center gap-2.5 bg-[linear-gradient(180deg,#2f6fa8_0%,#214e79_100%)] px-4 py-3 text-[15px] font-semibold [color:#f8fbff] visited:[color:#f8fbff] hover:[color:#fff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <Heart className="h-4 w-4 flex-none" strokeWidth={2.25} aria-hidden="true" />
              Donate to Mekor
            </Link>
            {sponsorKiddush ? (
              <Link
                href={sponsorKiddush.href}
                prefetch={false}
                onClick={onClose}
                className="block border-t border-white/15 bg-[#1c4368] px-4 py-2.5 text-[13.5px] [color:#cfe0ef] visited:[color:#cfe0ef] hover:[color:#fff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                Sponsor a Kiddush — celebrate a simcha
              </Link>
            ) : null}
          </div>

          {/* WhatsApp — primary growth channel, first-class banner */}
          <a
            href={JOIN_US_LINK.href}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 flex items-center gap-2.5 rounded-[16px] border border-[#c4dcc9] bg-[#e7f2e9] px-4 py-3 transition hover:border-[#8fbf9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <span className="h-2 w-2 flex-none rounded-full bg-[#2e9e5b]" aria-hidden="true" />
            <span className="grid gap-px">
              <span className="text-[15px] font-semibold text-[#1e5c3d]">Join the Mekor WhatsApp</span>
              <span className="text-[12px] text-[#2f5f42]">Announcements, minyan updates &amp; community chat</span>
            </span>
          </a>

          {/* Everything else — dense accordions */}
          <ul className="mt-3 grid gap-2">
            {MOBILE_GROUPS.map((group) => {
              const groupId = getGroupId(group.label);
              const isExpanded = expandedId === groupId;
              const groupActive =
                isNavigationPathActive(currentPath, group.href) ||
                group.children.some((child) => isNavigationPathActive(currentPath, child.href));

              return (
                <li
                  key={group.label}
                  className={cn(
                    "overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-white/80",
                    groupActive && "border-[var(--color-border-strong)]",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left text-[15px] font-semibold text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                    aria-expanded={isExpanded}
                    aria-controls={`native-mobile-submenu-${groupId}`}
                    onClick={() => setExpandedId(isExpanded ? null : groupId)}
                  >
                    {group.label}
                    <ChevronDown
                      className={cn("h-4 w-4 text-[var(--color-muted)] transition-transform", isExpanded && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                  {isExpanded ? (
                    <ul id={`native-mobile-submenu-${groupId}`} className="grid px-2 pb-2">
                      {group.children.map((child) => (
                        <li key={child.label}>
                          <Link
                            href={child.href}
                            prefetch={false}
                            onClick={onClose}
                            aria-current={isNavigationPathActive(currentPath, child.href) ? "page" : undefined}
                            className={cn(
                              "block rounded-[10px] px-2.5 py-2 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-foreground)]",
                              isNavigationPathActive(currentPath, child.href) &&
                                "bg-[var(--color-surface-strong)] text-[var(--color-foreground)]",
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Members strip + demoted search */}
        <div className="border-t border-[var(--color-border)] pt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Members</span>
            {isCheckingAuth ? (
              <span className="text-[13px] text-[var(--color-muted)]">Checking…</span>
            ) : authenticated ? (
              <span className="flex items-center gap-1.5">
                <Link
                  href="/account"
                  prefetch={false}
                  onClick={onClose}
                  className="rounded-full border border-[var(--color-border)] bg-white px-3.5 py-2 text-[13.5px] font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-surface-strong)]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/logout"
                  prefetch={false}
                  className="rounded-full px-3.5 py-2 text-[13.5px] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                >
                  Sign Out
                </Link>
              </span>
            ) : (
              <Link
                href="/login?next=%2Fmembers"
                prefetch={false}
                onClick={onClose}
                className="rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-[13.5px] font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-surface-strong)]"
              >
                Sign In
              </Link>
            )}
          </div>
          {authenticated && !isCheckingAuth ? (
            <ul className="mt-2 grid grid-cols-2 gap-x-2">
              {MEMBERS_MENU.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    prefetch={false}
                    onClick={onClose}
                    className="block rounded-[10px] px-2 py-1.5 text-[13px] text-[var(--color-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-foreground)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            className="mt-2 py-1.5 text-left text-[13px] text-[var(--color-muted)] transition hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            onClick={() => {
              onClose();
              openUniversalSearch();
            }}
          >
            Search the site <span className="ml-1 font-mono text-[11px] uppercase tracking-[0.14em]">⌘K</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
