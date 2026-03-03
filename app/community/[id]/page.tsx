import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { isFeatureEnabled } from "@/lib/config/features";
import { isAnonymousVisibility } from "@/lib/users/visibility";
import styles from "./page.module.css";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CommunityProfilePage({ params }: PageProps) {
  if (!isFeatureEnabled("FEATURE_PUBLIC_DIRECTORY")) {
    return (
      <main className={styles.page}>
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

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId < 1) {
    notFound();
  }

  const [member] = await getDb()
    .select({
      id: users.id,
      displayName: users.displayName,
      bio: users.bio,
      city: users.city,
      avatarUrl: users.avatarUrl,
      profileVisibility: users.profileVisibility,
    })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        inArray(users.role, ["member", "admin"]),
        inArray(users.profileVisibility, ["public", "anonymous"]),
      ),
    )
    .limit(1);

  if (!member) {
    notFound();
  }

  const anonymous = isAnonymousVisibility(member.profileVisibility);

  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <header className={styles.header}>
          {member.avatarUrl && !anonymous ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatarUrl} alt={`${member.displayName} avatar`} className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder} aria-hidden="true">
              {(anonymous ? "C" : member.displayName).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1>{anonymous ? "Community Member" : member.displayName}</h1>
            {member.city ? <p className={styles.city}>{member.city}</p> : null}
          </div>
        </header>

        {member.bio ? <p className={styles.bio}>{member.bio}</p> : <p className={styles.bio}>No bio provided.</p>}

        <Link href="/community" className={styles.backLink}>
          ← Back to directory
        </Link>
      </article>
    </main>
  );
}
