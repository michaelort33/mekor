"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { DesktopNav } from "@/components/navigation/desktop-nav";
import { MobileDrawer } from "@/components/navigation/mobile-drawer";
import { NavBrand } from "@/components/navigation/nav-brand";
import { NavCta } from "@/components/navigation/nav-cta";
import { SITE_MENU } from "@/lib/navigation/site-menu";

type SiteNavigationProps = {
  currentPath: string;
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

export function SiteNavigation({ currentPath }: SiteNavigationProps) {
  const pathname = usePathname();
  const activePath = normalizePath(pathname ?? currentPath);
  const [openDesktopByPath, setOpenDesktopByPath] = useState<Record<string, string | null>>({});
  const [mobileOpenByPath, setMobileOpenByPath] = useState<Record<string, boolean>>({});
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousMobileOpenRef = useRef(false);
  const openDesktopGroupId = openDesktopByPath[activePath] ?? null;
  const mobileOpen = mobileOpenByPath[activePath] ?? false;

  const setOpenDesktopGroupId = useCallback(
    (groupId: string | null) => {
      setOpenDesktopByPath((previous) => ({
        ...previous,
        [activePath]: groupId,
      }));
    },
    [activePath],
  );

  const setMobileOpen = useCallback(
    (isOpen: boolean) => {
      setMobileOpenByPath((previous) => ({
        ...previous,
        [activePath]: isOpen,
      }));
    },
    [activePath],
  );

  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("#SITE_HEADER, #SITE_HEADER_WRAPPER, #SITE_HEADER-placeholder"),
    );

    targets.forEach((element) => {
      element.style.setProperty("display", "none", "important");
      element.style.setProperty("visibility", "hidden", "important");
    });

    const masterPage = document.querySelector<HTMLElement>("#masterPage");
    if (masterPage) {
      masterPage.style.setProperty("--header-height", "0px");
      masterPage.style.setProperty("--top-offset", "0px");
    }
  }, []);

  useEffect(() => {
    if (previousMobileOpenRef.current && !mobileOpen) {
      mobileTriggerRef.current?.focus();
    }

    previousMobileOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  return (
    <>
      <header className="native-nav" data-native-nav-root="true">
        <div className="native-nav__container">
          <NavBrand />

          <DesktopNav
            items={SITE_MENU}
            currentPath={activePath}
            openGroupId={openDesktopGroupId}
            setOpenGroupId={setOpenDesktopGroupId}
          />

          <div className="native-nav__actions">
            <div className="native-nav__cta-wrap">
              <NavCta />
            </div>
            <button
              ref={mobileTriggerRef}
              type="button"
              className="native-nav__mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
              aria-controls="native-mobile-drawer"
            >
              <span className="native-nav__sr-only">Open menu</span>
              <span aria-hidden="true">☰</span>
            </button>
          </div>
        </div>
      </header>

      <div id="native-mobile-drawer">
        <MobileDrawer
          items={SITE_MENU}
          currentPath={activePath}
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>
    </>
  );
}
