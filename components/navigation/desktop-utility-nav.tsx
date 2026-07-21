import Link from "next/link";

import { Button } from "@/components/ui/button";
import { isNavigationPathActive } from "@/lib/navigation/path";
import { DESKTOP_UTILITY_LINKS, JOIN_US_LINK } from "@/lib/navigation/site-menu";
import { cn } from "@/lib/utils";

type DesktopUtilityNavProps = {
  currentPath: string;
  isSignedIn: boolean;
  isCheckingAuth: boolean;
};

export function DesktopUtilityNav({
  currentPath,
  isSignedIn,
  isCheckingAuth,
}: DesktopUtilityNavProps) {
  const authAction = isCheckingAuth
    ? { label: "Checking…", href: "/login?next=%2Fmembers" }
    : isSignedIn
      ? { label: "Dashboard", href: "/account" }
      : { label: "Sign In", href: "/login?next=%2Fmembers" };

  return (
    <div className="hidden bg-[linear-gradient(180deg,#30699c_0%,#28618f_100%)] min-[1441px]:block">
      <div className="mx-auto flex min-h-[52px] w-full max-w-[110rem] items-center justify-center px-8">
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] p-1 shadow-[0_12px_28px_-22px_rgba(4,16,28,0.8)]">
          <nav aria-label="Quick links" className="flex items-center gap-1">
            {DESKTOP_UTILITY_LINKS.map((link) => {
              const isActive = isNavigationPathActive(currentPath, link.href);

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  prefetch={false}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-full px-4 text-[14.5px] font-semibold text-white/95 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75",
                    isActive && "bg-white/20 text-white shadow-sm",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <span className="h-6 w-px bg-white/20" aria-hidden="true" />

          <a
            href={JOIN_US_LINK.href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#2e9e5b] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#278a4f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
          >
            <span className="h-2 w-2 rounded-full bg-[#d6f5e2]" aria-hidden="true" />
            Join WhatsApp
          </a>

          <Button
            asChild
            size="sm"
            variant="ghost"
            className="min-h-10 border border-white/25 bg-white/10 px-4 text-[14px] !text-white hover:bg-white/20 hover:!text-white"
          >
            <Link href={authAction.href}>{authAction.label}</Link>
          </Button>

          {isSignedIn && !isCheckingAuth ? (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="min-h-10 px-3 text-[14px] !text-white/85 hover:bg-white/15 hover:!text-white"
            >
              <Link href="/logout">Sign Out</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
