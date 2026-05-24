import type { ReactNode } from "react";

import "@/styles/backend-tokens.css";

export const metadata = {
  title: "Admin | Mekor Habracha",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
