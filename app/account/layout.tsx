import type { ReactNode } from "react";

import "@/styles/backend-tokens.css";

export const metadata = {
  title: "Account | Mekor Habracha",
  robots: "noindex, nofollow",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
