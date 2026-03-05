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
  membershipStartDate: string | null;
  membershipRenewalDate: string | null;
  autoMessagesEnabled: boolean;
  stripeCustomerId: string | null;
  outstandingBalanceCents: number;
  createdAt: string;
  lastLoginAt: string | null;
};

type PageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
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
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);

  async function loadUsers(options?: { reset?: boolean; cursor?: string | null }) {
    setError("");
    if (options?.reset) {
      setLoading(true);
      setUsers([]);
      setPageInfo(null);
    }

    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (roleFilter) params.set("role", roleFilter);
    params.set("limit", "25");
    if (options?.cursor) params.set("cursor", options.cursor);

    const response = await fetch(`/api/admin/users?${params.toString()}`);
    if (response.status === 401) {
      router.push("/login?next=/admin/users");
      return;
    }

    const data = (await response.json().catch(() => ({}))) as {
      items?: AdminUser[];
      error?: string;
      actorRole?: AdminUser["role"];
      canManageAdminRoles?: boolean;
      pageInfo?: PageInfo;
    };
    if (!response.ok) {
      setError(data.error || "Unable to load users");
      setLoading(false);
      return;
    }

    setUsers((prev) => (options?.reset ? data.items ?? [] : [...prev, ...(data.items ?? [])]));
    setPageInfo(data.pageInfo ?? null);
    setActorRole(data.actorRole ?? null);
    setCanManageAdminRoles(Boolean(data.canManageAdminRoles));
    setLoading(false);
  }

  useEffect(() => {
    loadUsers({ reset: true }).catch(() => {
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
        membershipStartDate: user.membershipStartDate,
        membershipRenewalDate: user.membershipRenewalDate,
        autoMessagesEnabled: user.autoMessagesEnabled,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string; user?: AdminUser };
    if (!response.ok) {
      setError(data.error || "Unable to save user");
      setSavingId(null);
      return;
    }

    setUsers((prev) =>
      prev.map((item) => (item.id === user.id ? { ...item, ...(data.user ?? {}) } : item)),
    );
    setSavingId(null);
  }

  function updateLocalUser(id: number, patch: Partial<AdminUser>) {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  }

  return (
    <main className={`${styles.page} internal-page`}>
      <header className={`${styles.header} internal-header`}>
        <div>
          <h1>Manage Users</h1>
          <p>Manage roles, profile visibility, membership dates, and automated reminder opt-in settings.</p>
        </div>
        <div className={`${styles.actions} internal-actions`}>
          <Link href="/admin/people" className={styles.backLink}>
            People CRM
          </Link>
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
          <Link href="/admin/messages" className={styles.backLink}>
            Message logs
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

        <button type="button" onClick={() => loadUsers({ reset: true })}>
          Apply
        </button>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
      {actorRole ? <p className={styles.meta}>Signed in as <strong>{actorRole}</strong></p> : null}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <>
          <section className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Visibility</th>
                  <th>Start date</th>
                  <th>Renewal date</th>
                  <th>Auto messages</th>
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
                    <td>
                      <input
                        type="date"
                        value={user.membershipStartDate ?? ""}
                        onChange={(event) =>
                          updateLocalUser(user.id, { membershipStartDate: event.target.value || null })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={user.membershipRenewalDate ?? ""}
                        onChange={(event) =>
                          updateLocalUser(user.id, { membershipRenewalDate: event.target.value || null })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={user.autoMessagesEnabled}
                        onChange={(event) =>
                          updateLocalUser(user.id, { autoMessagesEnabled: event.target.checked })
                        }
                      />
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
          {pageInfo?.hasNextPage && pageInfo.nextCursor ? (
            <div className={styles.loadMoreWrap}>
              <button type="button" onClick={() => loadUsers({ cursor: pageInfo.nextCursor })}>
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
