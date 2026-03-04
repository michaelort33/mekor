"use client";

import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        minHeight: "38px",
        borderRadius: "8px",
        border: "1px solid #c0c8d4",
        background: "#f0f2f5",
        color: "#4a5a6a",
        padding: "0 14px",
        fontSize: "0.84rem",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Sign Out
    </button>
  );
}
