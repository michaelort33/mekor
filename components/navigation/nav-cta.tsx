import Link from "next/link";

import { Button } from "@/components/ui/button";
import { JOIN_US_LINK, SUPPORT_MEKOR_LINK } from "@/lib/navigation/site-menu";

type NavCtaProps = {
  isSignedIn: boolean;
  isCheckingAuth: boolean;
};

export function NavCta({ isSignedIn, isCheckingAuth }: NavCtaProps) {
  const authAction = isCheckingAuth
    ? { label: "Checking…", href: "/login?next=%2Fmembers", variant: "signin" as const }
    : isSignedIn
      ? { label: "Dashboard", href: "/account", variant: "members" as const }
      : { label: "Sign In", href: "/login?next=%2Fmembers", variant: "signin" as const };
  const signOutAction = { label: "Sign Out", href: "/logout", variant: "signout" as const };

  const links = [
    { ...SUPPORT_MEKOR_LINK, label: "Donate", variant: "donate" as const },
    { ...JOIN_US_LINK, label: "Join WhatsApp", variant: "join" as const },
    authAction,
    ...(isSignedIn && !isCheckingAuth ? [signOutAction] : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map((link) => {
        const external = /^https?:\/\//i.test(link.href);
        const variant =
          link.variant === "donate"
            ? "default"
            : link.variant === "join"
              ? "secondary"
              : link.variant === "members"
                ? "secondary"
                : "ghost";
        const className =
          link.variant === "donate"
            ? "bg-[var(--color-foreground)] text-white hover:bg-[color-mix(in_srgb,var(--color-foreground)_88%,black)]"
            : link.variant === "signin" || link.variant === "signout"
              ? "bg-white/78 hover:bg-white"
              : "";

        if (!external) {
          return (
            <Button
              key={link.label}
              asChild
              size="sm"
              variant={variant}
              className={className}
              aria-label={link.label}
            >
              <Link href={link.href}>
                <span>{link.label}</span>
              </Link>
            </Button>
          );
        }

        return (
          <Button
            key={link.label}
            asChild
            size="sm"
            variant={variant}
            className={className}
            aria-label={link.label}
          >
            <a href={link.href} target="_blank" rel="noreferrer noopener">
              <span>{link.label}</span>
            </a>
          </Button>
        );
      })}
    </div>
  );
}
