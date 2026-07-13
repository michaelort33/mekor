import Image from "next/image";
import Link from "next/link";

import { BRAND_ASSETS } from "@/lib/brand-assets";

export function NavBrand() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-3 rounded-full border border-white/45 bg-white/72 px-3.5 py-3 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.38)] backdrop-blur"
      aria-label="Mekor Habracha home"
    >
      <Image
        src={BRAND_ASSETS.primaryWordmark.url}
        alt={BRAND_ASSETS.primaryWordmark.alt}
        width={BRAND_ASSETS.primaryWordmark.width}
        height={BRAND_ASSETS.primaryWordmark.height}
        className="block h-8 w-auto self-center sm:h-9"
        style={{ maxWidth: "15rem" }}
        priority
      />
    </Link>
  );
}
