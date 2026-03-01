import Image from "next/image";
import Link from "next/link";

const NAV_LOGO_SRC =
  "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/0e7eb1aca1600d826faed04eadbc5835ac195a52-unnamed-20-5-.jpg";

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
