import { JOIN_US_LINK, SUPPORT_MEKOR_LINK } from "@/lib/navigation/site-menu";

type NavCtaProps = {
  isSignedIn: boolean;
  isCheckingAuth: boolean;
};

export function NavCta({ isSignedIn, isCheckingAuth }: NavCtaProps) {
  const authAction = isCheckingAuth
    ? { label: "Checking…", href: "/login?next=%2Fmembers", variant: "signin" as const }
    : isSignedIn
      ? { label: "Members Area", href: "/members", variant: "members" as const }
      : { label: "Sign In", href: "/login?next=%2Fmembers", variant: "signin" as const };

  const links = [
    { ...JOIN_US_LINK, variant: "join" as const },
    { ...SUPPORT_MEKOR_LINK, variant: "support" as const },
    authAction,
  ];

  return (
    <div className="native-nav__cta-list">
      {links.map((link) => {
        const external = /^https?:\/\//i.test(link.href);
        return (
          <a
            key={link.label}
            href={link.href}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer noopener" : undefined}
            className={`native-nav__cta native-nav__cta--${link.variant}`}
            aria-label={link.label}
          >
            <span className="native-nav__cta-label">{link.label}</span>
          </a>
        );
      })}
    </div>
  );
}
