"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { isNavigationPathActive } from "@/lib/navigation/path";
import { isNavGroup, type NavColumn, type NavItem } from "@/lib/navigation/site-menu";
import { cn } from "@/lib/utils";

type DesktopNavProps = {
  items: NavItem[];
  currentPath: string;
  openGroupId: string | null;
  setOpenGroupId: (groupId: string | null) => void;
};

function getGroupId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * 6-item primary nav. Groups with `columns` render a two-column panel
 * (with optional highlighted card, e.g. "Plan a visit"); groups without
 * columns render a simple single-column dropdown.
 */
export function DesktopNav({ items, currentPath, openGroupId, setOpenGroupId }: DesktopNavProps) {
  const rootRef = useRef<HTMLElement | null>(null);
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
        `#native-desktop-panel-${groupId} a[href]`,
      );
      firstSubmenuLink?.focus();
    });
  };

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenGroupId(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroupId(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearCloseTimer();
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [setOpenGroupId]);

  return (
    <nav
      ref={rootRef}
      aria-label="Primary"
      className="hidden items-center gap-1 min-[1441px]:flex"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !rootRef.current?.contains(nextTarget)) {
          clearCloseTimer();
          setOpenGroupId(null);
        }
      }}
    >
      {items.map((item) => {
        const isActive = isNavigationPathActive(currentPath, item.href);

        if (!isNavGroup(item)) {
          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch={false}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-[15px] text-[var(--color-foreground)] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                isActive && "bg-white/85 font-semibold",
              )}
            >
              {item.label}
            </Link>
          );
        }

        const groupId = getGroupId(item.label);
        const isOpen = openGroupId === groupId;
        const groupActive =
          isActive || item.children.some((child) => isNavigationPathActive(currentPath, child.href));
        const columns: NavColumn[] =
          item.columns ?? [{ title: item.label, links: item.children }];

        return (
          <div
            key={item.label}
            className="relative"
            onMouseEnter={() => {
              clearCloseTimer();
              setOpenGroupId(groupId);
            }}
            onMouseLeave={scheduleClose}
          >
            <button
              ref={(node) => {
                groupButtonRefs.current[groupId] = node;
              }}
              type="button"
              aria-expanded={isOpen}
              aria-haspopup="true"
              aria-controls={`native-desktop-panel-${groupId}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[15px] text-[var(--color-foreground)] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                (isOpen || groupActive) && "bg-white/85 font-semibold shadow-[0_10px_24px_-18px_rgba(15,23,42,0.4)]",
              )}
              onClick={() => {
                clearCloseTimer();
                setOpenGroupId(groupId);
              }}
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
              }}
            >
              {item.label}
              <ChevronDown
                className={cn("h-3 w-3 text-[var(--color-muted)] transition-transform", isOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>

            {isOpen ? (
              <div
                id={`native-desktop-panel-${groupId}`}
                className="absolute left-1/2 top-[calc(100%+12px)] z-50 flex w-max max-w-[720px] -translate-x-1/2 gap-8 rounded-[20px] border border-[var(--color-border)] bg-white px-7 py-6 shadow-[0_34px_70px_-34px_rgba(15,23,42,0.4)]"
              >
                {columns.map((col) => (
                  <div
                    key={col.title}
                    className={cn(
                      "min-w-[190px]",
                      col.highlight &&
                        "-m-2 w-[240px] rounded-[14px] border border-[#d9e4ee] bg-[#f2f6fa] p-4",
                    )}
                  >
                    <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {col.title}
                    </div>
                    <div className="grid gap-0.5">
                      {col.links.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          prefetch={false}
                          onClick={() => setOpenGroupId(null)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setOpenGroupId(null);
                              groupButtonRefs.current[groupId]?.focus();
                            }
                          }}
                          aria-current={isNavigationPathActive(currentPath, link.href) ? "page" : undefined}
                          className={cn(
                            "-mx-2.5 rounded-[10px] px-2.5 py-2 text-[15px] leading-snug text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-strong)]",
                            isNavigationPathActive(currentPath, link.href) &&
                              "bg-[var(--color-surface-strong)] font-semibold",
                          )}
                        >
                          {link.label}
                          {link.note ? (
                            <span className="block text-[12.5px] text-[var(--color-muted)]">{link.note}</span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
