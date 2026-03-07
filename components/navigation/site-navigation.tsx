"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { DesktopNav } from "@/components/navigation/desktop-nav";
import { MobileDrawer } from "@/components/navigation/mobile-drawer";
import { NavBrand } from "@/components/navigation/nav-brand";
import { NavCta } from "@/components/navigation/nav-cta";
import type { UserSessionRole } from "@/lib/auth/session";
import { normalizeNavigationPath } from "@/lib/navigation/path";
import { SITE_MENU } from "@/lib/navigation/site-menu";

type SiteNavigationProps = {
  currentPath: string;
};

export function SiteNavigation({ currentPath }: SiteNavigationProps) {
  const pathname = usePathname();
  const activePath = normalizeNavigationPath(pathname ?? currentPath);
  const [openDesktopByPath, setOpenDesktopByPath] = useState<Record<string, string | null>>({});
  const [mobileOpenByPath, setMobileOpenByPath] = useState<Record<string, boolean>>({});
  const [role, setRole] = useState<UserSessionRole | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
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
    if (previousMobileOpenRef.current && !mobileOpen) {
      mobileTriggerRef.current?.focus();
    }

    previousMobileOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/status", { cache: "no-store" });
        if (!active) {
          return;
        }

        if (!response.ok) {
          setRole(null);
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as {
          role?: UserSessionRole | null;
        };
        setRole(payload.role ?? null);
      } catch {
        if (active) {
          setRole(null);
        }
      } finally {
        if (active) {
          setIsCheckingAuth(false);
        }
      }
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, []);

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
              <NavCta isSignedIn={role !== null} isCheckingAuth={isCheckingAuth} />
            </div>
            <button
              ref={mobileTriggerRef}
              type="button"
              className="native-nav__mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
              aria-controls="native-mobile-drawer"
              aria-haspopup="dialog"
              aria-label="Open main menu"
            >
              <span className="native-nav__sr-only">Open menu</span>
              <span aria-hidden="true">☰</span>
            </button>
          </div>
        </div>
      </header>

      <div>
        <MobileDrawer
          items={SITE_MENU}
          currentPath={activePath}
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          drawerId="native-mobile-drawer"
          titleId="native-mobile-drawer-title"
          role={role}
          isCheckingAuth={isCheckingAuth}
        />
      </div>
    </>
  );
}
