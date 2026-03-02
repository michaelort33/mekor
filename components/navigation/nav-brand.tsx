import Image from "next/image";
import Link from "next/link";

const NAV_LOGO_SRC =
  "/images/branding/mekor-wordmark.jpg";

export function NavBrand() {
  return (
    <Link href="/" className="native-nav__brand" aria-label="Mekor Habracha home">
      <Image
        src={NAV_LOGO_SRC}
        alt="Mekor Habracha"
        width={291}
        height={60}
        className="native-nav__brand-logo"
        priority
      />
    </Link>
  );
}
