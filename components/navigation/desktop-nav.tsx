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
    <div className="native-nav__desktop" ref={rootRef}>
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
                >
                  {item.label}
                </Link>
                <button
                  type="button"
                  className="native-nav__desktop-chevron"
                  aria-expanded={isOpen}
                  aria-controls={submenuId}
                  onClick={() => setOpenGroupId(isOpen ? null : groupId)}
                  onFocus={() => setOpenGroupId(groupId)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setOpenGroupId(groupId);
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
                role="menu"
              >
                <ul className="native-nav__submenu-list">
                  {item.children.map((child) => {
                    const childActive = isPathActive(currentPath, child.href);
                    return (
                      <li key={child.label}>
                        <Link
                          href={child.href}
                          className={`native-nav__submenu-link${childActive ? " is-active" : ""}`}
                          role="menuitem"
                          onClick={() => setOpenGroupId(null)}
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
