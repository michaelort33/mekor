import Image from "next/image";
import Link from "next/link";

const NAV_LOGO_SRC =
  "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/8d56cce33726c33d42709208275014f132a7859d-mekor-wordmark.png";

export function NavBrand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 overflow-hidden rounded-full border border-white/45 bg-white/72 px-3.5 py-3 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.38)] backdrop-blur"
      aria-label="Mekor Habracha home"
    >
      <Image
        src={NAV_LOGO_SRC}
        alt="Mekor Habracha"
        width={291}
        height={60}
        className="self-center"
        style={{ width: "clamp(11rem, 15vw, 14rem)", height: "auto", maxWidth: "none", maxHeight: "38px" }}
        priority
      />
    </Link>
  );
}
