import { JOIN_US_LINK, SUPPORT_MEKOR_LINK } from "@/lib/navigation/site-menu";

export function NavCta() {
  const links = [
    { ...JOIN_US_LINK, variant: "join" as const },
    { ...SUPPORT_MEKOR_LINK, variant: "support" as const },
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
            <span className="native-nav__cta-icon" aria-hidden="true">
              {link.variant === "join" ? (
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 2.2a9.74 9.74 0 0 0-8.5 14.5L2 22l5.46-1.43A9.79 9.79 0 1 0 12 2.2Zm0 17.83a8.08 8.08 0 0 1-4.11-1.12l-.3-.17-3.24.85.87-3.15-.19-.32a8.12 8.12 0 1 1 6.97 3.91Zm4.45-5.89c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.96-.14.17-.28.19-.52.07-.24-.12-1.01-.37-1.92-1.18-.71-.64-1.19-1.42-1.32-1.66-.14-.24-.01-.36.1-.48.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.39-.41-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2.01 0 1.19.86 2.34.98 2.5.12.16 1.68 2.56 4.07 3.59.57.25 1.01.39 1.36.5.57.18 1.09.15 1.5.09.46-.07 1.43-.58 1.63-1.13.2-.56.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M20.68 17.62a1 1 0 0 1-1.39.06L12 10.85l-7.29 6.83a1 1 0 0 1-1.36-1.46l8-7.5a1 1 0 0 1 1.36 0l8 7.5a1 1 0 0 1-.03 1.4Z" />
                </svg>
              )}
            </span>
          </a>
        );
      })}
    </div>
  );
}
