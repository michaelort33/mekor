import Image from "next/image";
import Link from "next/link";

const NAV_LOGO_SRC =
  "/images/branding/mekor-wordmark.jpg";

export function NavBrand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-full border border-white/45 bg-white/72 px-3 py-2 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.38)] backdrop-blur"
      aria-label="Mekor Habracha home"
    >
      <Image
        src={NAV_LOGO_SRC}
        alt="Mekor Habracha"
        width={291}
        height={60}
        className="h-auto w-[10.5rem] sm:w-[12rem]"
        priority
      />
    </Link>
  );
}
