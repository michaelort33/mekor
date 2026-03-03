import type { ReactNode } from "react";

export const metadata = {
  title: "Admin | Mekor Habracha",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
