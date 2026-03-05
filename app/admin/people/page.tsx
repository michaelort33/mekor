"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type PersonStatus = "lead" | "invited" | "visitor" | "member" | "admin" | "super_admin" | "inactive";

type PersonRow = {
  id: number;
  userId: number | null;
  status: PersonStatus;
  displayName: string;
  email: string;
  phone: string;
  city: string;
  source: string;
  tags: string[];
  invitedAt: string | null;
  lastContactedAt: string | null;
  outstandingBalanceCents: number;
  invitation: {
    invitationId: number;
    invitationStatus: "active" | "accepted" | "revoked" | "expired";
    invitationCreatedAt: string;
  } | null;
  createdAt: string;
};

type PageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
};

const STATUS_OPTIONS: PersonStatus[] = ["lead", "invited", "visitor", "member", "admin", "super_admin", "inactive"];

type CreateLeadForm = {
  displayName: string;
  email: string;
  phone: string;
  city: string;
  source: string;
  tags: string;
  notes: string;
};

const initialLeadForm: CreateLeadForm = {
  displayName: "",
  email: "",
  phone: "",
  city: "",
  source: "admin",
  tags: "",
  notes: "",
};

export default function AdminPeoplePage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | PersonStatus>("");
  const [tag, setTag] = useState("");
  const [invited, setInvited] = useState<"" | "yes" | "no">("");
  const [dues, setDues] = useState<"" | "open" | "overdue">("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<PersonRow[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [leadForm, setLeadForm] = useState<CreateLeadForm>(initialLeadForm);

  async function loadPeople(options?: { reset?: boolean; cursor?: string | null }) {
    setError("");
    if (options?.reset) {
      setLoading(true);
      setItems([]);
      setPageInfo(null);
    }

    const params = new URLSearchParams();
    params.set("limit", "25");
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (tag.trim()) params.set("tag", tag.trim());
    if (invited) params.set("invited", invited);
    if (dues) params.set("dues", dues);
    if (options?.cursor) params.set("cursor", options.cursor);

    const response = await fetch(`/api/admin/people?${params.toString()}`);
    if (response.status === 401) {
      router.push("/login?next=/admin/people");
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      items?: PersonRow[];
      pageInfo?: PageInfo;
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error || "Unable to load people");
      setLoading(false);
      return;
    }

    setItems((prev) => (options?.reset ? payload.items ?? [] : [...prev, ...(payload.items ?? [])]));
    setPageInfo(payload.pageInfo ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadPeople({ reset: true }).catch(() => {
      setError("Unable to load people");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/admin/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "lead",
        firstName: "",
        lastName: "",
        displayName: leadForm.displayName,
        email: leadForm.email,
        phone: leadForm.phone,
        city: leadForm.city,
        notes: leadForm.notes,
        source: leadForm.source,
        tags: leadForm.tags
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part.length > 0),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; person?: { id: number } };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || "Unable to create lead");
      return;
    }

    setNotice("Lead created.");
    setLeadForm(initialLeadForm);
    if (payload.person?.id) {
      router.push(`/admin/people/${payload.person.id}`);
      return;
    }
    await loadPeople({ reset: true });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>People CRM</h1>
          <p>Manage leads, invited users, and members in one directory.</p>
        </div>
        <div className={styles.links}>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/invitations">Invitations</Link>
          <Link href="/admin/messages">Messages</Link>
          <Link href="/admin/dues">Dues</Link>
        </div>
      </header>

      <section className={styles.card}>
        <h2>Create lead</h2>
        <form className={styles.createForm} onSubmit={createLead}>
          <input
            value={leadForm.displayName}
            onChange={(event) => setLeadForm((prev) => ({ ...prev, displayName: event.target.value }))}
            placeholder="Display name"
            required
          />
          <input
            type="email"
            value={leadForm.email}
            onChange={(event) => setLeadForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email"
            required
          />
          <input
            value={leadForm.phone}
            onChange={(event) => setLeadForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Phone"
          />
          <input
            value={leadForm.city}
            onChange={(event) => setLeadForm((prev) => ({ ...prev, city: event.target.value }))}
            placeholder="City"
          />
          <input
            value={leadForm.source}
            onChange={(event) => setLeadForm((prev) => ({ ...prev, source: event.target.value }))}
            placeholder="Source (web, referral, etc)"
          />
          <input
            value={leadForm.tags}
            onChange={(event) => setLeadForm((prev) => ({ ...prev, tags: event.target.value }))}
            placeholder="Tags (comma-separated)"
          />
          <textarea
            value={leadForm.notes}
            onChange={(event) => setLeadForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes"
            rows={2}
          />
          <button type="submit" disabled={working}>
            {working ? "Creating..." : "Create lead"}
          </button>
        </form>
      </section>

      <section className={styles.filters}>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search name, email, phone, notes" />
        <select value={status} onChange={(event) => setStatus(event.target.value as "" | PersonStatus)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Tag filter" />
        <select value={invited} onChange={(event) => setInvited(event.target.value as "" | "yes" | "no")}>
          <option value="">Invited: all</option>
          <option value="yes">Invited only</option>
          <option value="no">Not invited</option>
        </select>
        <select value={dues} onChange={(event) => setDues(event.target.value as "" | "open" | "overdue")}>
          <option value="">Dues: all</option>
          <option value="open">Open dues</option>
          <option value="overdue">Overdue dues</option>
        </select>
        <button type="button" onClick={() => loadPeople({ reset: true })}>
          Apply
        </button>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}

      {loading ? (
        <p>Loading people...</p>
      ) : (
        <>
          <section className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Tags</th>
                  <th>Invite</th>
                  <th>Dues</th>
                  <th>Last contact</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((person) => (
                  <tr key={person.id}>
                    <td>
                      {person.displayName}
                      <br />
                      <small>{person.city || "-"}</small>
                    </td>
                    <td>{person.status}</td>
                    <td>{person.email}</td>
                    <td>{person.tags.length > 0 ? person.tags.join(", ") : "-"}</td>
                    <td>{person.invitation?.invitationStatus ?? "-"}</td>
                    <td>
                      {(person.outstandingBalanceCents / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                    <td>{person.lastContactedAt ? new Date(person.lastContactedAt).toLocaleString() : "-"}</td>
                    <td>
                      <Link href={`/admin/people/${person.id}`}>Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {pageInfo?.hasNextPage && pageInfo.nextCursor ? (
            <div className={styles.loadMore}>
              <button type="button" onClick={() => loadPeople({ cursor: pageInfo.nextCursor })}>
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
