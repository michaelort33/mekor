import Link from "next/link";
import { and, asc, eq, gt, inArray, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { MembersBreadcrumbs } from "@/components/members/members-breadcrumbs";
import { getUserSession } from "@/lib/auth/session";
import { decodeCursor, parsePageLimit, toPaginatedResult } from "@/lib/pagination/cursor";
import { isAnonymousVisibility } from "@/lib/users/visibility";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const membersCursorSchema = z.object({
  displayName: z.string(),
  id: z.number().int().min(1),
});

type MembersPageProps = {
  searchParams: Promise<{
    cursor?: string;
    limit?: string;
  }>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const session = await getUserSession();
  if (!session) {
    redirect("/login?next=/members");
  }

  const query = await searchParams;
  const limit = parsePageLimit(query.limit);
  const parsedCursor = decodeCursor(query.cursor, membersCursorSchema);
  if (parsedCursor.error) {
    redirect("/members");
  }
  const cursor = parsedCursor.value;

  const rows = await getDb()
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
        inArray(users.role, ["member", "admin", "super_admin"]),
        inArray(users.profileVisibility, ["members", "public", "anonymous"]),
        cursor
          ? or(
              gt(users.displayName, cursor.displayName),
              and(eq(users.displayName, cursor.displayName), gt(users.id, cursor.id)),
            )
          : undefined,
      ),
    )
    .orderBy(asc(users.displayName), asc(users.id))
    .limit(limit + 1);

  const { items: members, pageInfo } = toPaginatedResult(rows, limit, (row) => ({
    displayName: row.displayName,
    id: row.id,
  }));

  const nextUrl = pageInfo.nextCursor
    ? `/members?cursor=${encodeURIComponent(pageInfo.nextCursor)}&limit=${pageInfo.limit}`
    : null;

  return (
    <main className={styles.page}>
      <MembersBreadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Members Area" }]}
        context="member"
        activeSection="members"
      />

      <header className={styles.header}>
        <h1>Members Area</h1>
        <p>Browse community members who chose to be visible.</p>
      </header>

      {members.length === 0 ? (
        <section className={styles.empty}>
          <p>No visible members yet.</p>
          <Link href="/account/profile">Update your profile visibility</Link>
        </section>
      ) : (
        <>
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
                  {!isAnonymousVisibility(member.profileVisibility) ? <p className={styles.role}>{member.role}</p> : null}
                  <h2>{isAnonymousVisibility(member.profileVisibility) ? "Community Member" : member.displayName}</h2>
                  {!isAnonymousVisibility(member.profileVisibility) && member.city ? <p className={styles.city}>{member.city}</p> : null}
                  {!isAnonymousVisibility(member.profileVisibility) && member.bio ? <p className={styles.bio}>{member.bio}</p> : null}
                  <Link href={`/members/${member.id}`}>View profile</Link>
                </div>
              </article>
            ))}
          </section>
          {nextUrl ? (
            <div className={styles.loadMoreWrap}>
              <Link href={nextUrl} className={styles.loadMoreButton}>
                Load more
              </Link>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
