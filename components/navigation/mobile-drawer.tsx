"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { NavBrand } from "@/components/navigation/nav-brand";
import { NavCta } from "@/components/navigation/nav-cta";
import type { NavItem } from "@/lib/navigation/site-menu";
import { isNavGroup } from "@/lib/navigation/site-menu";

type MobileDrawerProps = {
  items: NavItem[];
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
  drawerId: string;
  titleId: string;
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

function getFocusableElements(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));
}

export function MobileDrawer({ items, currentPath, isOpen, onClose, drawerId, titleId }: MobileDrawerProps) {
  const initialExpanded = useMemo(() => {
    const expanded = new Set<string>();

    items.forEach((item) => {
      if (!isNavGroup(item)) {
        return;
      }

      if (item.children.some((child) => isPathActive(currentPath, child.href)) || isPathActive(currentPath, item.href)) {
        expanded.add(getGroupId(item.label));
      }
    });

    return expanded;
  }, [currentPath, items]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(initialExpanded);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setExpandedIds(initialExpanded);
  }, [initialExpanded]);

  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove("native-nav--mobile-open");
      return;
    }

    document.body.classList.add("native-nav--mobile-open");
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const drawer = drawerRef.current;
      if (!drawer) {
        return;
      }

      const focusableElements = getFocusableElements(drawer);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !drawer.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.body.classList.remove("native-nav--mobile-open");
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={drawerRef}
      id={drawerId}
      className="native-nav__mobile-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="native-nav__sr-only">
        Main menu
      </h2>
      <div className="native-nav__mobile-header">
        <NavBrand />
        <button ref={closeButtonRef} type="button" className="native-nav__mobile-close" onClick={onClose}>
          <span className="native-nav__sr-only">Close menu</span>
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <nav className="native-nav__mobile-nav" aria-label="Mobile site menu">
        <ul className="native-nav__mobile-list">
          {items.map((item) => {
            if (!isNavGroup(item)) {
              return (
                <li key={item.label} className="native-nav__mobile-item">
                  <Link
                    href={item.href}
                    className={`native-nav__mobile-link${isPathActive(currentPath, item.href) ? " is-active" : ""}`}
                    onClick={onClose}
                    aria-current={isPathActive(currentPath, item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            }

            const groupId = getGroupId(item.label);
            const isExpanded = expandedIds.has(groupId);

            return (
              <li key={item.label} className="native-nav__mobile-item native-nav__mobile-item--group">
                <div className="native-nav__mobile-group-row">
                  <Link
                    href={item.href}
                    className={`native-nav__mobile-link${isPathActive(currentPath, item.href) ? " is-active" : ""}`}
                    onClick={onClose}
                    aria-current={isPathActive(currentPath, item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    className="native-nav__mobile-expand"
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
                    <span className="native-nav__sr-only">Toggle {item.label} submenu</span>
                    <span aria-hidden="true">▾</span>
                  </button>
                </div>

                {isExpanded ? (
                  <ul id={`native-mobile-submenu-${groupId}`} className="native-nav__mobile-submenu is-open">
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <Link
                          href={child.href}
                          className={`native-nav__mobile-sublink${isPathActive(currentPath, child.href) ? " is-active" : ""}`}
                          onClick={onClose}
                          aria-current={isPathActive(currentPath, child.href) ? "page" : undefined}
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

      <div className="native-nav__mobile-footer">
        <NavCta />
      </div>
    </div>
  );
}
