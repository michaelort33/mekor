"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import type { NavItem } from "@/lib/navigation/site-menu";
import { cn } from "@/lib/utils";
import { isNavigationPathActive } from "@/lib/navigation/path";
import { isNavGroup } from "@/lib/navigation/site-menu";

type DesktopNavProps = {
  items: NavItem[];
  currentPath: string;
  openGroupId: string | null;
  setOpenGroupId: (groupId: string | null) => void;
};

function getGroupId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function DesktopNav({
  items,
  currentPath,
  openGroupId,
  setOpenGroupId,
}: DesktopNavProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenGroupId(null);
      closeTimerRef.current = null;
    }, 140);
  };

  const focusFirstSubmenuLink = (groupId: string) => {
    window.requestAnimationFrame(() => {
      const firstSubmenuLink = rootRef.current?.querySelector<HTMLAnchorElement>(
        `#native-nav-submenu-${groupId} .native-nav__submenu-link`,
      );
      firstSubmenuLink?.focus();
    });
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenGroupId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenGroupId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearCloseTimer();
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setOpenGroupId]);

  return (
    <div
      className="hidden xl:block"
      ref={rootRef}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !rootRef.current?.contains(nextTarget)) {
          clearCloseTimer();
          setOpenGroupId(null);
        }
      }}
    >
      <ul className="flex items-center gap-1 rounded-full border border-white/40 bg-white/72 px-2 py-2 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.44)] backdrop-blur">
        {items.map((item) => {
          const active = isNavigationPathActive(currentPath, item.href);

          if (!isNavGroup(item)) {
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "inline-flex items-center whitespace-nowrap rounded-full px-3 py-2 text-[14px] font-medium tracking-[0.01em] text-[var(--color-muted)] transition hover:bg-black/5 hover:text-[var(--color-foreground)]",
                    active && "bg-[var(--color-surface-strong)] text-[var(--color-foreground)] shadow-[0_16px_30px_-24px_rgba(15,23,42,0.35)]",
                  )}
                  onClick={() => setOpenGroupId(null)}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          }

          const groupId = getGroupId(item.label);
          const isOpen = openGroupId === groupId;
          const submenuId = `native-nav-submenu-${groupId}`;

          return (
            <li
              key={item.label}
              className="relative"
              onMouseEnter={() => {
                clearCloseTimer();
                setOpenGroupId(groupId);
              }}
              onMouseLeave={scheduleClose}
            >
              <div className="flex items-center rounded-full">
                <Link
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "inline-flex items-center whitespace-nowrap rounded-full px-3 py-2 text-[14px] font-medium tracking-[0.01em] text-[var(--color-muted)] transition hover:bg-black/5 hover:text-[var(--color-foreground)]",
                    active && "bg-[var(--color-surface-strong)] text-[var(--color-foreground)] shadow-[0_16px_30px_-24px_rgba(15,23,42,0.35)]",
                    isOpen && "text-[var(--color-foreground)]",
                  )}
                  onFocus={() => {
                    clearCloseTimer();
                    setOpenGroupId(groupId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setOpenGroupId(groupId);
                      focusFirstSubmenuLink(groupId);
                    }
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
                <button
                  ref={(node) => {
                    groupButtonRefs.current[groupId] = node;
                  }}
                  type="button"
                  className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-black/5 hover:text-[var(--color-foreground)]"
                  aria-expanded={isOpen}
                  aria-controls={submenuId}
                  aria-haspopup="true"
                  aria-label={`Toggle ${item.label} submenu`}
                  onClick={() => setOpenGroupId(isOpen ? null : groupId)}
                  onFocus={() => {
                    clearCloseTimer();
                    setOpenGroupId(groupId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setOpenGroupId(groupId);
                      focusFirstSubmenuLink(groupId);
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      setOpenGroupId(null);
                    }
                  }}
                >
                  <span className="sr-only">Toggle {item.label} submenu</span>
                  <span aria-hidden="true">▾</span>
                </button>
              </div>
              <div
                id={submenuId}
                className={cn(
                  "absolute left-0 top-[calc(100%+0.85rem)] z-40 min-w-[18rem] rounded-[28px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.96)] p-3 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.52)] backdrop-blur transition",
                  isOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
                  <Badge>Explore</Badge>
                  <Link href={item.href} className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    View All
                  </Link>
                </div>
                <ul className="grid gap-1">
                  {item.children.map((child) => {
                    const childActive = isNavigationPathActive(currentPath, child.href);
                    return (
                      <li key={child.label}>
                        <Link
                          href={child.href}
                          prefetch={false}
                          className={cn(
                            "block rounded-[20px] px-4 py-3 text-sm font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-foreground)]",
                            childActive && "bg-[var(--color-surface-strong)] text-[var(--color-foreground)]",
                          )}
                          aria-current={childActive ? "page" : undefined}
                          onClick={() => setOpenGroupId(null)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setOpenGroupId(null);
                              groupButtonRefs.current[groupId]?.focus();
                            }
                          }}
                        >
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
