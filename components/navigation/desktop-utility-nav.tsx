import Link from "next/link";

import { isNavigationPathActive } from "@/lib/navigation/path";
import { DESKTOP_UTILITY_LINKS, JOIN_US_LINK } from "@/lib/navigation/site-menu";
import { cn } from "@/lib/utils";

type DesktopUtilityNavProps = {
  currentPath: string;
  isSignedIn: boolean;
  isCheckingAuth: boolean;
  isCollapsed: boolean;
};

/**
 * Top utility tier (option 4a, center-weighted): go-do links + WhatsApp sit
 * dead-center on the navy bar, auth keeps the right corner. Collapses away on
 * scroll so the sticky header condenses to the single browse tier.
 */
export function DesktopUtilityNav({
  currentPath,
  isSignedIn,
  isCheckingAuth,
  isCollapsed,
}: DesktopUtilityNavProps) {
  const authAction = isSignedIn
    ? { label: "Dashboard", href: "/account" }
    : { label: "Sign In", href: "/login?next=%2Fmembers" };

  return (
    <div
      className={cn(
        "hidden bg-[linear-gradient(180deg,#30699c_0%,#28618f_100%)] transition-all duration-300 ease-out motion-reduce:transition-none min-[1441px]:block",
        isCollapsed ? "invisible max-h-0 opacity-0" : "visible max-h-14 opacity-100",
      )}
      aria-hidden={isCollapsed || undefined}
    >
      <div className="relative mx-auto flex min-h-[38px] w-full max-w-[110rem] items-center justify-center px-8">
        <nav aria-label="Quick links" className="flex items-center gap-1">
          {DESKTOP_UTILITY_LINKS.map((link) => {
            const isActive = isNavigationPathActive(currentPath, link.href);

            return (
              <Link
                key={link.label}
                href={link.href}
                prefetch={false}
                tabIndex={isCollapsed ? -1 : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium text-white/95 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75",
                  isActive && "bg-white/20 font-semibold text-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <a
          href={JOIN_US_LINK.href}
          target="_blank"
          rel="noreferrer noopener"
          tabIndex={isCollapsed ? -1 : undefined}
          className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-[#237a45] px-3 py-1 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-[#1f6f3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#d6f5e2]" aria-hidden="true" />
          {JOIN_US_LINK.label}
        </a>

        <div className="absolute right-8 flex items-center gap-3">
          {isCheckingAuth ? (
            <span className="text-[13px] text-white/60" aria-hidden="true">
              Sign In
            </span>
          ) : (
            <>
              <Link
                href={authAction.href}
                prefetch={false}
                tabIndex={isCollapsed ? -1 : undefined}
                className="rounded-sm text-[13px] font-medium text-white/85 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
              >
                {authAction.label}
              </Link>
              {isSignedIn ? (
                <Link
                  href="/logout"
                  prefetch={false}
                  tabIndex={isCollapsed ? -1 : undefined}
                  className="rounded-sm text-[13px] text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
                >
                  Sign Out
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
