import type { Metadata } from "next";
import Link from "next/link";

import { NativeShell } from "@/components/navigation/native-shell";
import { getPublicViewerContext } from "@/lib/members/viewer";
import { listPublicMemberProfiles } from "@/lib/members/store";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Member Directory | Mekor Habracha",
  description: "Browse community member profiles and connect with neighbors.",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

export default async function MembersDirectoryPage() {
  const viewer = await getPublicViewerContext();
  const profiles = await listPublicMemberProfiles(viewer);

  return (
    <NativeShell currentPath="/members" className={styles.shell} contentClassName={styles.content}>
      <header className={styles.header}>
        <h1>Member Directory</h1>
        <p>Public and community-shared profiles appear here.</p>
      </header>

      {profiles.length === 0 ? (
        <section className={styles.empty}>
          <p>No member profiles are available right now.</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label="Member profile directory">
          {profiles.map((profile) => (
            <article key={profile.slug} className={styles.card}>
              <div className={styles.avatar} aria-hidden="true">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" />
                ) : (
                  profile.displayName.slice(0, 1)
                )}
              </div>
              <h2>{profile.displayName}</h2>
              {profile.city ? <p className={styles.meta}>{profile.city}</p> : null}
              {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
              {profile.interests.length > 0 ? (
                <ul className={styles.interests}>
                  {profile.interests.map((interest) => (
                    <li key={interest}>{interest}</li>
                  ))}
                </ul>
              ) : null}
              {!profile.isAnonymous && (profile.email || profile.phone) ? (
                <div className={styles.contact}>
                  {profile.email ? <p>Email: {profile.email}</p> : null}
                  {profile.phone ? <p>Phone: {profile.phone}</p> : null}
                </div>
              ) : null}
              <Link href={`/members/${profile.slug}`} className={styles.link}>
                View profile
              </Link>
            </article>
          ))}
        </section>
      )}
    </NativeShell>
  );
}
