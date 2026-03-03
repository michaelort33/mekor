import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/logout-button";
import { listMemberProfilesForAdmin } from "@/lib/members/store";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const VISIBILITY_LABELS: Record<string, string> = {
  private: "Private",
  members_only: "Members only",
  public: "Public",
  anonymous: "Anonymous",
};

export default async function AdminMemberProfilesPage() {
  const profiles = process.env.DATABASE_URL ? await listMemberProfilesForAdmin() : [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1>Member Profiles</h1>
          <div className={styles.actions}>
            <Link href="/admin/member-profiles/new" className={styles.primaryLink}>
              + New Profile
            </Link>
            <Link href="/admin/templates" className={styles.secondaryLink}>
              Templates
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
        <p>Manage directory profile visibility and contact details.</p>
      </header>

      {profiles.length === 0 ? (
        <div className={styles.empty}>
          <p>No profiles yet.</p>
          <Link href="/admin/member-profiles/new" className={styles.primaryLink}>
            Create your first profile
          </Link>
        </div>
      ) : (
        <section className={styles.grid} aria-label="Admin member profiles">
          {profiles.map((profile) => (
            <article key={profile.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>{profile.fullName}</h2>
                <span className={`${styles.badge} ${styles[`badge--${profile.visibility}`] ?? ""}`}>
                  {VISIBILITY_LABELS[profile.visibility] ?? profile.visibility}
                </span>
              </div>
              <p className={styles.slug}>/{profile.slug}</p>
              {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
              <div className={styles.cardActions}>
                <Link href={`/admin/member-profiles/${profile.id}/edit`} className={styles.actionLink}>
                  Edit
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
