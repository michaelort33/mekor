import { JOIN_US_LINK } from "@/lib/navigation/site-menu";

export function NavCta() {
  return (
    <a
      href={JOIN_US_LINK.href}
      target="_blank"
      rel="noreferrer noopener"
      className="native-nav__cta"
    >
      {JOIN_US_LINK.label}
    </a>
  );
}
