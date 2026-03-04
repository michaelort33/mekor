"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type AdminUser = {
  id: number;
  email: string;
  displayName: string;
  role: "visitor" | "member" | "admin" | "super_admin";
  profileVisibility: "private" | "members" | "public" | "anonymous";
  stripeCustomerId: string | null;
  outstandingBalanceCents: number;
  createdAt: string;
  lastLoginAt: string | null;
};

const ROLE_OPTIONS: AdminUser["role"][] = ["visitor", "member", "admin", "super_admin"];
const VISIBILITY_OPTIONS: AdminUser["profileVisibility"][] = ["private", "members", "public", "anonymous"];

export default function AdminUsersPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | AdminUser["role"]>("");
  const [actorRole, setActorRole] = useState<AdminUser["role"] | null>(null);
  const [canManageAdminRoles, setCanManageAdminRoles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);

  async function loadUsers() {
    setError("");
    setLoading(true);

    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (roleFilter) params.set("role", roleFilter);

    const response = await fetch(`/api/admin/users?${params.toString()}`);
    if (response.status === 401) {
      router.push("/admin/login");
      return;
    }

    const data = (await response.json().catch(() => ({}))) as {
      users?: AdminUser[];
      error?: string;
      actorRole?: AdminUser["role"];
      canManageAdminRoles?: boolean;
    };
    if (!response.ok) {
      setError(data.error || "Unable to load users");
      setLoading(false);
      return;
    }

    setUsers(data.users ?? []);
    setActorRole(data.actorRole ?? null);
    setCanManageAdminRoles(Boolean(data.canManageAdminRoles));
    setLoading(false);
  }

  useEffect(() => {
    loadUsers().catch(() => {
      setError("Unable to load users");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveUser(user: AdminUser) {
    setError("");
    setSavingId(user.id);

    const response = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        role: user.role,
        profileVisibility: user.profileVisibility,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string; user?: AdminUser };
    if (!response.ok) {
      setError(data.error || "Unable to save user");
      setSavingId(null);
      return;
    }

    setUsers((prev) => prev.map((item) => (item.id === user.id ? data.user ?? item : item)));
    setSavingId(null);
  }

  function updateLocalUser(id: number, patch: Partial<AdminUser>) {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Manage Users</h1>
          <p>Promote visitors and control profile visibility. Only super admins can manage admin-level roles.</p>
        </div>
        <div className={styles.actions}>
          <Link href="/admin/settings" className={styles.backLink}>
            Settings
          </Link>
          <Link href="/admin/dues" className={styles.backLink}>
            Dues admin
          </Link>
          <Link href="/admin/events" className={styles.backLink}>
            Events admin
          </Link>
          <Link href="/admin/templates" className={styles.backLink}>
            Templates
          </Link>
          <Link href="/admin/invitations" className={styles.backLink}>
            Invitations
          </Link>
        </div>
      </header>

      <section className={styles.filters}>
        <label>
          Search
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Email or display name" />
        </label>

        <label>
          Role
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "" | AdminUser["role"])}>
            <option value="">All</option>
            {(canManageAdminRoles ? ROLE_OPTIONS : ROLE_OPTIONS.filter((role) => role !== "super_admin")).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={() => loadUsers()}>
          Apply
        </button>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
      {actorRole ? <p className={styles.meta}>Signed in as <strong>{actorRole}</strong></p> : null}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <section className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Visibility</th>
                <th>Stripe customer</th>
                <th>Outstanding</th>
                <th>Last login</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.displayName}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      disabled={!canManageAdminRoles && (user.role === "admin" || user.role === "super_admin")}
                      onChange={(event) =>
                        updateLocalUser(user.id, { role: event.target.value as AdminUser["role"] })
                      }
                    >
                      {(canManageAdminRoles
                        ? ROLE_OPTIONS
                        : [
                            "visitor" as const,
                            "member" as const,
                            ...(user.role === "admin" || user.role === "super_admin" ? [user.role] : []),
                          ]).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={user.profileVisibility}
                      onChange={(event) =>
                        updateLocalUser(user.id, {
                          profileVisibility: event.target.value as AdminUser["profileVisibility"],
                        })
                      }
                    >
                      {VISIBILITY_OPTIONS.map((visibility) => (
                        <option key={visibility} value={visibility}>
                          {visibility}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{user.stripeCustomerId ?? "Unlinked"}</td>
                  <td>
                    {(user.outstandingBalanceCents / 100).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </td>
                  <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => saveUser(user)}
                      disabled={
                        savingId === user.id ||
                        (!canManageAdminRoles && (user.role === "admin" || user.role === "super_admin"))
                      }
                    >
                      {savingId === user.id ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
