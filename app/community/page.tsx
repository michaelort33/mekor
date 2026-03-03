import Link from "next/link";
import { and, asc, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { MembersBreadcrumbs } from "@/components/members/members-breadcrumbs";
import { isFeatureEnabled } from "@/lib/config/features";
import { isAnonymousVisibility } from "@/lib/users/visibility";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function CommunityDirectoryPage() {
  const hasPublicDirectory = isFeatureEnabled("FEATURE_PUBLIC_DIRECTORY");

  if (!hasPublicDirectory) {
    return (
      <main className={styles.page}>
        <MembersBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Community Directory" },
          ]}
        />

        <header className={styles.header}>
          <h1>Community Directory</h1>
          <p>Public directory is temporarily unavailable. Sign in to access the Members Directory.</p>
        </header>
        <section className={styles.empty}>
          <Link href="/members">Go to Members Directory</Link>
        </section>
      </main>
    );
  }

  const members = await getDb()
    .select({
      id: users.id,
      displayName: users.displayName,
      bio: users.bio,
      city: users.city,
      avatarUrl: users.avatarUrl,
      profileVisibility: users.profileVisibility,
    })
    .from(users)
    .where(and(inArray(users.role, ["member", "admin"]), inArray(users.profileVisibility, ["public", "anonymous"])))
    .orderBy(asc(users.displayName));

  return (
    <main className={styles.page}>
      <MembersBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Community Directory" },
        ]}
      />

      <header className={styles.header}>
        <h1>Community Directory</h1>
        <p>Meet members who chose to share their profile publicly.</p>
      </header>

      {members.length === 0 ? (
        <section className={styles.empty}>
          <p>No public profiles yet.</p>
        </section>
      ) : (
        <section className={styles.grid}>
          {members.map((member) => (
            <article key={member.id} className={styles.card}>
              {member.avatarUrl && !isAnonymousVisibility(member.profileVisibility) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt={`${member.displayName} avatar`} className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder} aria-hidden="true">
                  {(isAnonymousVisibility(member.profileVisibility) ? "C" : member.displayName).charAt(0).toUpperCase()}
                </div>
              )}

              <div className={styles.body}>
                <h2>{isAnonymousVisibility(member.profileVisibility) ? "Community Member" : member.displayName}</h2>
                {member.city ? <p className={styles.city}>{member.city}</p> : null}
                {member.bio ? <p className={styles.bio}>{member.bio}</p> : null}
                <Link href={`/community/${member.id}`}>View profile</Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
