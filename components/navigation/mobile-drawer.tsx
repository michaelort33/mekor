"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { NavBrand } from "@/components/navigation/nav-brand";
import { NavCta } from "@/components/navigation/nav-cta";
import type { NavItem } from "@/lib/navigation/site-menu";
import { isNavGroup } from "@/lib/navigation/site-menu";

type MobileDrawerProps = {
  items: NavItem[];
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
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

export function MobileDrawer({ items, currentPath, isOpen, onClose }: MobileDrawerProps) {
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

  useEffect(() => {
    setExpandedIds(initialExpanded);
  }, [initialExpanded]);

  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove("native-nav--mobile-open");
      return;
    }

    document.body.classList.add("native-nav--mobile-open");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("native-nav--mobile-open");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="native-nav__mobile-drawer" role="dialog" aria-modal="true" aria-label="Main menu">
      <div className="native-nav__mobile-header">
        <NavBrand />
        <button type="button" className="native-nav__mobile-close" onClick={onClose}>
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
                  >
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    className="native-nav__mobile-expand"
                    aria-expanded={isExpanded}
                    aria-controls={`native-mobile-submenu-${groupId}`}
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

                <ul
                  id={`native-mobile-submenu-${groupId}`}
                  className={`native-nav__mobile-submenu${isExpanded ? " is-open" : ""}`}
                >
                  {item.children.map((child) => (
                    <li key={child.label}>
                      <Link
                        href={child.href}
                        className={`native-nav__mobile-sublink${isPathActive(currentPath, child.href) ? " is-active" : ""}`}
                        onClick={onClose}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
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
