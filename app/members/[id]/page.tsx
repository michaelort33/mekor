import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { isAnonymousVisibility } from "@/lib/users/visibility";
import styles from "./page.module.css";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({ params }: PageProps) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId < 1) {
    notFound();
  }

  const session = await getUserSession();
  if (!session) {
    redirect(`/login?next=/members/${userId}`);
  }

  const [member] = await getDb()
    .select({
      id: users.id,
      displayName: users.displayName,
      bio: users.bio,
      city: users.city,
      avatarUrl: users.avatarUrl,
      role: users.role,
      profileVisibility: users.profileVisibility,
    })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        inArray(users.role, ["member", "admin"]),
        inArray(users.profileVisibility, ["members", "public", "anonymous"]),
      ),
    )
    .limit(1);

  if (!member) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <header className={styles.header}>
          {member.avatarUrl && !isAnonymousVisibility(member.profileVisibility) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatarUrl} alt={`${member.displayName} avatar`} className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder} aria-hidden="true">
              {(isAnonymousVisibility(member.profileVisibility) ? "C" : member.displayName).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            {!isAnonymousVisibility(member.profileVisibility) ? <p className={styles.role}>{member.role}</p> : null}
            <h1>{isAnonymousVisibility(member.profileVisibility) ? "Community Member" : member.displayName}</h1>
            {member.city ? <p className={styles.city}>{member.city}</p> : null}
          </div>
        </header>

        {member.bio ? <p className={styles.bio}>{member.bio}</p> : <p className={styles.bio}>No bio provided.</p>}

        <Link href="/members" className={styles.backLink}>
          ← Back to members
        </Link>
      </article>
    </main>
  );
}
