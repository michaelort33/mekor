"use client";

import { Menu } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { DesktopNav } from "@/components/navigation/desktop-nav";
import { MobileDrawer } from "@/components/navigation/mobile-drawer";
import { NavBrand } from "@/components/navigation/nav-brand";
import { NavCta } from "@/components/navigation/nav-cta";
import { UniversalSearch } from "@/components/navigation/universal-search";
import { Button } from "@/components/ui/button";
import type { AccountAccessState } from "@/lib/auth/account-access";
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
  const [authenticated, setAuthenticated] = useState(false);
  const [canAccessMembersArea, setCanAccessMembersArea] = useState(false);
  const [accessState, setAccessState] = useState<AccountAccessState | null>(null);
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
          setAuthenticated(false);
          setCanAccessMembersArea(false);
          setAccessState(null);
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as {
          authenticated?: boolean;
          canAccessMembersArea?: boolean;
          accessState?: AccountAccessState | null;
        };
        setAuthenticated(Boolean(payload.authenticated));
        setCanAccessMembersArea(Boolean(payload.canAccessMembersArea));
        setAccessState(payload.accessState ?? null);
      } catch {
        if (active) {
          setAuthenticated(false);
          setCanAccessMembersArea(false);
          setAccessState(null);
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
      <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8" data-native-nav-root="true">
        <div className="mx-auto flex w-full max-w-[84rem] items-center justify-between gap-3">
          <NavBrand />

          <DesktopNav
            items={SITE_MENU}
            currentPath={activePath}
            openGroupId={openDesktopGroupId}
            setOpenGroupId={setOpenDesktopGroupId}
          />

          <div className="flex flex-none items-center gap-2">
            <UniversalSearch compact />
            <div className="hidden min-[1441px]:flex">
              <NavCta isSignedIn={authenticated} isCheckingAuth={isCheckingAuth} />
            </div>
            <Button
              ref={mobileTriggerRef}
              type="button"
              variant="secondary"
              size="icon"
              className="min-[1441px]:hidden"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
              aria-controls="native-mobile-drawer"
              aria-haspopup="dialog"
              aria-label="Open main menu"
            >
              <span className="sr-only">Open menu</span>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
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
          authenticated={authenticated}
          canAccessMembersArea={canAccessMembersArea}
          accessState={accessState}
          isCheckingAuth={isCheckingAuth}
        />
      </div>
    </>
  );
}
