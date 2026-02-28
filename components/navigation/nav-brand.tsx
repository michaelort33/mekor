import Link from "next/link";

export function NavBrand() {
  return (
    <Link href="/" className="native-nav__brand" aria-label="Mekor Habracha home">
      <span className="native-nav__brand-title">Mekor Habracha</span>
      <span className="native-nav__brand-subtitle">Center City Synagogue</span>
    </Link>
  );
}
