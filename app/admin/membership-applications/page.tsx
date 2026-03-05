"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import {
  formatUsd,
  getApplicationTypeLabel,
  getMembershipCategoryLabel,
  getPaymentMethodLabel,
  type MembershipApplicationStatus,
} from "@/lib/membership/applications";
import styles from "./page.module.css";

type ApplicationItem = {
  id: number;
  status: MembershipApplicationStatus;
  applicationType: "new" | "renewal";
  membershipCategory: "single" | "couple_family" | "student";
  preferredPaymentMethod: "undecided" | "check" | "venmo" | "paypal" | "credit_card" | "other";
  includeSecurityDonation: boolean;
  coverOnlineFees: boolean;
  totalAmountCents: number;
  firstName: string;
  lastName: string;
  displayName: string;
  hebrewName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  spouseFirstName: string;
  spouseLastName: string;
  spouseHebrewName: string;
  spouseEmail: string;
  spousePhone: string;
  householdMembersJson: Array<{ name: string; hebrewName: string; relationship: string }>;
  yahrzeitsJson: Array<{ name: string; relationship: string; hebrewDate: string; englishDate: string }>;
  volunteerInterestsJson: string[];
  notes: string;
  reviewNotes: string;
  reviewedAt: string | null;
  reviewedByUserId: number | null;
  approvedPersonId: number | null;
  invitationId: number | null;
  createdAt: string;
};

const STATUS_OPTIONS: Array<"" | MembershipApplicationStatus> = ["", "pending", "approved", "declined"];

export default function AdminMembershipApplicationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | MembershipApplicationStatus>("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  const stats = useMemo(() => {
    const pendingCount = items.filter((item) => item.status === "pending").length;
    const approvedCount = items.filter((item) => item.status === "approved").length;
    const totalValue = items.reduce((sum, item) => sum + item.totalAmountCents, 0);
    return [
      { label: "Loaded applications", value: String(items.length), hint: "Current filtered queue" },
      { label: "Pending", value: String(pendingCount), hint: "Needs admin review" },
      { label: "Dues represented", value: formatUsd(totalValue), hint: `${approvedCount} approved so far in this view` },
    ];
  }, [items]);

  async function loadApplications() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);

    const response = await fetch(`/api/admin/membership-applications?${params.toString()}`);
    if (response.status === 401) {
      router.push("/login?next=/admin/membership-applications");
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as { items?: ApplicationItem[]; error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to load applications");
      setLoading(false);
      return;
    }

    setItems(payload.items ?? []);
    setReviewNotes(
      Object.fromEntries((payload.items ?? []).map((item) => [item.id, item.reviewNotes || ""])) as Record<number, string>,
    );
    setLoading(false);
  }

  useEffect(() => {
    loadApplications().catch(() => {
      setError("Unable to load applications");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function applyDecision(applicationId: number, action: "approve" | "decline") {
    setWorkingId(applicationId);
    setError("");
    setNotice("");
    const response = await fetch(`/api/admin/membership-applications/${applicationId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNotes: reviewNotes[applicationId] ?? "" }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || `Unable to ${action} application`);
      setWorkingId(null);
      return;
    }
    setNotice(action === "approve" ? "Application approved and welcome email sent." : "Application declined.");
    setWorkingId(null);
    await loadApplications();
  }

  return (
    <AdminShell
      currentPath="/admin/membership-applications"
      title="Membership Applications"
      description="Review hosted membership submissions, approve applicants into the CRM, and trigger the welcome flow without leaving the admin workspace."
      stats={stats}
      actions={<Link href="/admin/people" className={adminStyles.actionPill}>Open people CRM</Link>}
    >
      <section className={adminStyles.toolbar}>
        <div className={adminStyles.toolbarHeader}>
          <p className={adminStyles.toolbarTitle}>Application filters</p>
          <p className={adminStyles.toolbarMeta}>Search by applicant name, email, or phone and narrow the review queue by status.</p>
        </div>
        <div className={adminStyles.toolbarFields}>
          <label>
            Search
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, email, or phone" />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as "" | MembershipApplicationStatus)}>
              {STATUS_OPTIONS.map((value) => (
                <option key={value || "all"} value={value}>
                  {value || "all"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={adminStyles.toolbarActions}>
          <button type="button" className={adminStyles.primaryButton} onClick={() => void loadApplications()}>
            Apply filters
          </button>
          <button
            type="button"
            className={adminStyles.secondaryButton}
            onClick={() => {
              setQ("");
              setStatus("pending");
            }}
          >
            Reset to pending
          </button>
        </div>
      </section>

      <section className={styles.stack}>
        {error ? <p className={styles.error}>{error}</p> : null}
        {notice ? <p className={adminStyles.notice}>{notice}</p> : null}
        {loading ? (
          <section className={`${styles.card} internal-card`}>
            <p>Loading applications...</p>
          </section>
        ) : items.length === 0 ? (
          <section className={`${styles.card} internal-card`}>
            <p>No applications found for this filter set.</p>
          </section>
        ) : (
          items.map((item) => (
            <article key={item.id} className={`${styles.card} internal-card`}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.kicker}>{item.status}</p>
                  <h2>{item.displayName}</h2>
                  <p className={styles.meta}>
                    {item.email} · {item.phone} · submitted {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className={styles.summaryPills}>
                  <span>{getApplicationTypeLabel(item.applicationType)}</span>
                  <span>{getMembershipCategoryLabel(item.membershipCategory)}</span>
                  <span>{formatUsd(item.totalAmountCents)}</span>
                </div>
              </div>

              <div className={styles.grid}>
                <section className={styles.panel}>
                  <h3>Applicant</h3>
                  <dl className={styles.detailList}>
                    <div><dt>Name</dt><dd>{item.displayName}</dd></div>
                    <div><dt>Hebrew name</dt><dd>{item.hebrewName || "-"}</dd></div>
                    <div><dt>Address</dt><dd>{[item.addressLine1, item.addressLine2, `${item.city}, ${item.state} ${item.postalCode}`].filter(Boolean).join(", ")}</dd></div>
                    <div><dt>Payment preference</dt><dd>{getPaymentMethodLabel(item.preferredPaymentMethod)}</dd></div>
                    <div><dt>Security donation</dt><dd>{item.includeSecurityDonation ? "Included" : "Declined"}</dd></div>
                    <div><dt>Online fee preference</dt><dd>{item.coverOnlineFees ? "Will cover online fees" : "No online-fee add-on selected"}</dd></div>
                  </dl>
                </section>

                <section className={styles.panel}>
                  <h3>Household</h3>
                  <dl className={styles.detailList}>
                    <div><dt>Spouse / partner</dt><dd>{[item.spouseFirstName, item.spouseLastName].filter(Boolean).join(" ") || "-"}</dd></div>
                    <div><dt>Spouse email</dt><dd>{item.spouseEmail || "-"}</dd></div>
                    <div><dt>Spouse phone</dt><dd>{item.spousePhone || "-"}</dd></div>
                  </dl>
                  {item.householdMembersJson.length ? (
                    <ul className={styles.inlineList}>
                      {item.householdMembersJson.map((member, index) => (
                        <li key={`${item.id}-member-${index}`}>
                          <strong>{member.name}</strong>
                          {member.relationship ? ` · ${member.relationship}` : ""}
                          {member.hebrewName ? ` · ${member.hebrewName}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.muted}>No additional household members listed.</p>
                  )}
                </section>

                <section className={styles.panel}>
                  <h3>Yahrzeits and interests</h3>
                  {item.yahrzeitsJson.length ? (
                    <ul className={styles.inlineList}>
                      {item.yahrzeitsJson.map((row, index) => (
                        <li key={`${item.id}-yahrzeit-${index}`}>
                          <strong>{row.name}</strong>
                          {row.relationship ? ` · ${row.relationship}` : ""}
                          {row.hebrewDate ? ` · ${row.hebrewDate}` : ""}
                          {row.englishDate ? ` · ${row.englishDate}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.muted}>No yahrzeits submitted.</p>
                  )}
                  <p className={styles.muted}>
                    Volunteer interests: {item.volunteerInterestsJson.length ? item.volunteerInterestsJson.join(", ") : "None selected"}
                  </p>
                </section>
              </div>

              {item.notes ? (
                <section className={styles.notesPanel}>
                  <h3>Applicant notes</h3>
                  <p>{item.notes}</p>
                </section>
              ) : null}

              <section className={styles.reviewPanel}>
                <label className={styles.notesField}>
                  <span>Admin review notes</span>
                  <textarea
                    rows={4}
                    value={reviewNotes[item.id] ?? ""}
                    onChange={(event) =>
                      setReviewNotes((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="Internal notes, payment follow-up, or membership conditions"
                  />
                </label>
                <div className={styles.actions}>
                  {item.status === "pending" ? (
                    <>
                      <button type="button" onClick={() => void applyDecision(item.id, "decline")} disabled={workingId === item.id}>
                        {workingId === item.id ? "Working..." : "Decline"}
                      </button>
                      <button type="button" className={styles.primaryButton} onClick={() => void applyDecision(item.id, "approve")} disabled={workingId === item.id}>
                        {workingId === item.id ? "Working..." : "Approve and welcome"}
                      </button>
                    </>
                  ) : (
                    <p className={styles.muted}>Reviewed {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : ""}</p>
                  )}
                </div>
              </section>
            </article>
          ))
        )}
      </section>
    </AdminShell>
  );
}
