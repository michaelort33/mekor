"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { NavItem } from "@/lib/navigation/site-menu";
import { isNavGroup } from "@/lib/navigation/site-menu";

type DesktopNavProps = {
  items: NavItem[];
  currentPath: string;
  openGroupId: string | null;
  setOpenGroupId: (groupId: string | null) => void;
};

function normalizePath(path: string) {
  if (!path) {
    return "/";
  }

  if (path === "/") {
    return "/";
  }

  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function isPathActive(currentPath: string, targetPath: string) {
  const current = normalizePath(currentPath);
  const target = normalizePath(targetPath);

  if (target === "/") {
    return current === target;
  }

  return current === target || current.startsWith(`${target}/`);
}

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
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setOpenGroupId]);

  return (
    <div
      className="native-nav__desktop"
      ref={rootRef}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !rootRef.current?.contains(nextTarget)) {
          setOpenGroupId(null);
        }
      }}
    >
      <ul className="native-nav__desktop-list">
        {items.map((item) => {
          const active = isPathActive(currentPath, item.href);

          if (!isNavGroup(item)) {
            return (
              <li key={item.label} className="native-nav__desktop-item">
                <Link
                  href={item.href}
                  className={`native-nav__desktop-link${active ? " is-active" : ""}`}
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
              className={`native-nav__desktop-item native-nav__desktop-item--group${isOpen ? " is-open" : ""}`}
              onMouseEnter={() => setOpenGroupId(groupId)}
              onMouseLeave={() => setOpenGroupId(null)}
            >
              <div className="native-nav__desktop-group-trigger">
                <Link
                  href={item.href}
                  className={`native-nav__desktop-link${active ? " is-active" : ""}`}
                  onFocus={() => setOpenGroupId(groupId)}
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
                  className="native-nav__desktop-chevron"
                  aria-expanded={isOpen}
                  aria-controls={submenuId}
                  aria-haspopup="true"
                  aria-label={`Toggle ${item.label} submenu`}
                  onClick={() => setOpenGroupId(isOpen ? null : groupId)}
                  onFocus={() => setOpenGroupId(groupId)}
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
                  <span className="native-nav__sr-only">Toggle {item.label} submenu</span>
                  <span aria-hidden="true">▾</span>
                </button>
              </div>
              <div
                id={submenuId}
                className={`native-nav__submenu${isOpen ? " is-open" : ""}`}
              >
                <ul className="native-nav__submenu-list">
                  {item.children.map((child) => {
                    const childActive = isPathActive(currentPath, child.href);
                    return (
                      <li key={child.label}>
                        <Link
                          href={child.href}
                          className={`native-nav__submenu-link${childActive ? " is-active" : ""}`}
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
