"use client";

import { Heart, Menu } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { DesktopNav } from "@/components/navigation/desktop-nav";
import { DesktopUtilityNav } from "@/components/navigation/desktop-utility-nav";
import { MobileDrawer } from "@/components/navigation/mobile-drawer";
import { NavBrand } from "@/components/navigation/nav-brand";
import { NavCta } from "@/components/navigation/nav-cta";
import { UniversalSearch } from "@/components/navigation/universal-search";
import { Button } from "@/components/ui/button";
import { normalizeNavigationPath } from "@/lib/navigation/path";
import { DESKTOP_BROWSE_MENU, SUPPORT_MEKOR_LINK } from "@/lib/navigation/site-menu";
import { cn } from "@/lib/utils";

type SiteNavigationProps = {
  currentPath: string;
};

export function SiteNavigation({ currentPath }: SiteNavigationProps) {
  const pathname = usePathname();
  const activePath = normalizeNavigationPath(pathname ?? currentPath);
  const [openDesktopByPath, setOpenDesktopByPath] = useState<Record<string, string | null>>({});
  const [mobileOpenByPath, setMobileOpenByPath] = useState<Record<string, boolean>>({});
  const [authenticated, setAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
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
    const syncScrolledState = () => setIsScrolled(window.scrollY > 24);

    syncScrolledState();
    window.addEventListener("scroll", syncScrolledState, { passive: true });

    return () => window.removeEventListener("scroll", syncScrolledState);
  }, []);

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
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as {
          authenticated?: boolean;
        };
        setAuthenticated(Boolean(payload.authenticated));
      } catch {
        if (active) {
          setAuthenticated(false);
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
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out motion-reduce:transition-none",
          isScrolled
            ? "border-[#d8cbb8]/80 bg-[#f8f3eb]/95 shadow-[0_16px_36px_-26px_rgba(15,23,42,0.58)] backdrop-blur-xl"
            : "border-transparent bg-transparent min-[1441px]:bg-[#f8f3eb]",
        )}
        data-native-nav-root="true"
        data-scrolled={isScrolled ? "true" : "false"}
      >
        <DesktopUtilityNav
          currentPath={activePath}
          isSignedIn={authenticated}
          isCheckingAuth={isCheckingAuth}
        />

        <div
          className={cn(
            "mx-auto flex w-full max-w-[110rem] items-center justify-between gap-3 px-4 transition-[padding] duration-300 ease-out motion-reduce:transition-none sm:px-6 lg:px-8",
            isScrolled ? "py-2 min-[1441px]:py-2.5" : "pb-0 pt-4 min-[1441px]:py-3",
          )}
        >
          <NavBrand compact={isScrolled} />

          <DesktopNav
            items={DESKTOP_BROWSE_MENU}
            currentPath={activePath}
            openGroupId={openDesktopGroupId}
            setOpenGroupId={setOpenDesktopGroupId}
          />

          <div className="flex flex-none items-center gap-2">
            <div className="hidden min-[1441px]:flex">
              <NavCta />
            </div>
            <Button
              asChild
              size="sm"
              className="min-[1441px]:hidden max-[359px]:w-9 max-[359px]:px-0 !text-[#f8fbff] hover:!text-white visited:!text-[#f8fbff]"
            >
              <Link href={SUPPORT_MEKOR_LINK.href} aria-label="Donate or sponsor Mekor">
                <Heart className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                <span className="max-[359px]:sr-only">Donate</span>
              </Link>
            </Button>
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

      <UniversalSearch hideTrigger />

      <div>
        <MobileDrawer
          currentPath={activePath}
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          drawerId="native-mobile-drawer"
          authenticated={authenticated}
          isCheckingAuth={isCheckingAuth}
        />
      </div>
    </>
  );
}
