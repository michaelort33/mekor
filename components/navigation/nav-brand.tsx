import Image from "next/image";
import Link from "next/link";

import { BRAND_ASSETS } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type NavBrandProps = {
  compact?: boolean;
};

export function NavBrand({ compact = false }: NavBrandProps) {
  return (
    <Link
      href="/"
      className={cn(
        "flex shrink-0 items-center gap-3 rounded-full border transition-[padding,background-color,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none",
        compact
          ? "border-transparent bg-transparent px-0 py-1 shadow-none"
          : "border-white/45 bg-white/72 px-3.5 py-3 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.38)] backdrop-blur",
      )}
      aria-label="Mekor Habracha home"
    >
      <Image
        src={BRAND_ASSETS.primaryWordmark.url}
        alt={BRAND_ASSETS.primaryWordmark.alt}
        width={BRAND_ASSETS.primaryWordmark.width}
        height={BRAND_ASSETS.primaryWordmark.height}
        className={cn(
          "block w-auto self-center transition-[height] duration-300 ease-out motion-reduce:transition-none",
          compact ? "h-7" : "h-8 sm:h-9",
        )}
        style={{ maxWidth: "15rem" }}
        priority
      />
    </Link>
  );
}
