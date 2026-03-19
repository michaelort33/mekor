"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { isNavigationPathActive } from "@/lib/navigation/path";
import { NavBrand } from "@/components/navigation/nav-brand";
import { NavCta } from "@/components/navigation/nav-cta";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { UserSessionRole } from "@/lib/auth/session";
import type { NavItem } from "@/lib/navigation/site-menu";
import { cn } from "@/lib/utils";
import { isNavGroup } from "@/lib/navigation/site-menu";
import { openUniversalSearch } from "@/components/navigation/universal-search";

type MobileDrawerProps = {
  items: NavItem[];
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
  drawerId: string;
  titleId: string;
  role: UserSessionRole | null;
  isCheckingAuth: boolean;
};

function getGroupId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function MobileDrawer({
  items,
  currentPath,
  isOpen,
  onClose,
  drawerId,
  titleId,
  role,
  isCheckingAuth,
}: MobileDrawerProps) {
  const initialExpanded = useMemo(() => {
    const expanded = new Set<string>();

    items.forEach((item) => {
      if (!isNavGroup(item)) {
        return;
      }

      if (
        item.children.some((child) => isNavigationPathActive(currentPath, child.href)) ||
        isNavigationPathActive(currentPath, item.href)
      ) {
        expanded.add(getGroupId(item.label));
      }
    });

    return expanded;
  }, [currentPath, items]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(initialExpanded);
  useEffect(() => {
    setExpandedIds(initialExpanded);
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
      <SheetContent id={drawerId} aria-labelledby={titleId} className="gap-6">
        <SheetHeader>
          <div className="flex items-center justify-between gap-4 pr-10">
            <NavBrand />
            <Badge>Public Site</Badge>
          </div>
          <SheetTitle id={titleId}>Browse Mekor</SheetTitle>
          <SheetDescription>One clear path through community life, events, and the kosher guide.</SheetDescription>
        </SheetHeader>

        <nav className="mt-6 flex-1 overflow-y-auto" aria-label="Mobile site menu">
          <ul className="space-y-3">
            {items.map((item) => {
              const isActive = isNavigationPathActive(currentPath, item.href);
              const itemClassName =
                item.tone === "cta"
                  ? "block rounded-[22px] border border-transparent bg-[linear-gradient(180deg,#2f6fa8_0%,#214e79_100%)] px-4 py-4 text-base font-semibold [color:#f8fbff] shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] visited:[color:#f8fbff]"
                  : "block rounded-[22px] border border-[var(--color-border)] bg-white/72 px-4 py-4 text-base font-medium text-[var(--color-foreground)] shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)]";

              if (!isNavGroup(item)) {
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      className={cn(
                        itemClassName,
                        isActive &&
                          item.tone !== "cta" &&
                          "border-[var(--color-border-strong)] bg-[var(--color-surface-strong)]",
                      )}
                      onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              const groupId = getGroupId(item.label);
              const isExpanded = expandedIds.has(groupId);
              const groupActive = isActive || item.children.some((child) => isNavigationPathActive(currentPath, child.href));

              return (
                <li
                  key={item.label}
                  className={cn(
                    "rounded-[26px] px-4 py-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)]",
                    item.tone === "cta"
                      ? "border border-transparent bg-[linear-gradient(180deg,#2f6fa8_0%,#214e79_100%)]"
                      : "border border-[var(--color-border)] bg-white/70",
                    groupActive && item.tone !== "cta" && "border-[var(--color-border-strong)] bg-[var(--color-surface-strong)]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Link
                      href={item.href}
                      prefetch={false}
                      className={cn(
                        "flex-1 text-base font-semibold",
                        item.tone === "cta" ? "[color:#f8fbff] visited:[color:#f8fbff]" : "text-[var(--color-foreground)]",
                      )}
                      onClick={onClose}
                      aria-current={groupActive ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-10 w-10 items-center justify-center rounded-full",
                        item.tone === "cta"
                          ? "border border-white/20 bg-white/10 text-white"
                          : "border border-[var(--color-border)] bg-white/85 text-[var(--color-muted)]",
                      )}
                      aria-expanded={isExpanded}
                      aria-controls={`native-mobile-submenu-${groupId}`}
                      aria-label={`Toggle ${item.label} submenu`}
                      onClick={() => {
                        setExpandedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(groupId)) {
                            next.delete(groupId);
                          } else {
                            next.add(groupId);
                          }
                          return next;
                        });
                      }}
                    >
                      <span className="sr-only">Toggle {item.label} submenu</span>
                      <span aria-hidden="true">▾</span>
                    </button>
                  </div>

                  {isExpanded ? (
                    <ul id={`native-mobile-submenu-${groupId}`} className="mt-3 grid gap-2">
                      {item.children.map((child) => (
                        <li key={child.label}>
                          <Link
                            href={child.href}
                            prefetch={false}
                            className={cn(
                              item.tone === "cta"
                                ? "block rounded-[18px] bg-white/10 px-3 py-3 text-sm font-medium text-white/90 transition hover:bg-white/18 hover:text-white"
                                : "block rounded-[18px] px-3 py-3 text-sm font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-foreground)]",
                              isNavigationPathActive(currentPath, child.href) &&
                                (item.tone === "cta"
                                  ? "bg-white/18 text-white"
                                  : "bg-[var(--color-surface-strong)] text-[var(--color-foreground)]"),
                            )}
                            onClick={onClose}
                            aria-current={isNavigationPathActive(currentPath, child.href) ? "page" : undefined}
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

        <div className="border-t border-[var(--color-border)] pt-5">
          <div className="mb-3">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-[22px] border border-[var(--color-border)] bg-white/78 px-4 py-4 text-left text-sm font-semibold text-[var(--color-foreground)] shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)]"
              onClick={() => {
                onClose();
                openUniversalSearch();
              }}
            >
              <span>Search the site</span>
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Command K</span>
            </button>
          </div>
          <NavCta isSignedIn={role !== null} isCheckingAuth={isCheckingAuth} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
