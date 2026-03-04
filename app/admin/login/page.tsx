import { redirect } from "next/navigation";

import { getUserSession } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  const session = await getUserSession();
  if (session && (session.role === "admin" || session.role === "super_admin")) {
    redirect("/admin");
  }

  redirect("/login?next=/admin");
}
