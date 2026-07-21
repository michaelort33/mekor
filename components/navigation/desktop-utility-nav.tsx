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
      <div className="mx-auto flex min-h-11 w-full max-w-[110rem] items-center justify-between gap-5 px-8">
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
                  "rounded-full px-3 py-1.5 text-[13.5px] font-medium text-white/90 transition hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75",
                  isActive && "bg-white/15 text-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href={JOIN_US_LINK.href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[#2e9e5b] px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#278a4f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
          >
            <span className="h-[7px] w-[7px] rounded-full bg-[#d6f5e2]" aria-hidden="true" />
            Join WhatsApp
          </a>

          <Button
            asChild
            size="xs"
            variant="ghost"
            className="min-h-8 px-3 text-[13.5px] !text-white/90 hover:bg-white/12 hover:!text-white"
          >
            <Link href={authAction.href}>{authAction.label}</Link>
          </Button>

          {isSignedIn && !isCheckingAuth ? (
            <Button
              asChild
              size="xs"
              variant="ghost"
              className="min-h-8 px-3 text-[13.5px] !text-white/80 hover:bg-white/12 hover:!text-white"
            >
              <Link href="/logout">Sign Out</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
