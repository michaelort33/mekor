import Link from "next/link";
import { and, asc, eq, gt, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { MembersBreadcrumbs } from "@/components/members/members-breadcrumbs";
import { isFeatureEnabled } from "@/lib/config/features";
import { decodeCursor, parsePageLimit, toPaginatedResult } from "@/lib/pagination/cursor";
import { isAnonymousVisibility } from "@/lib/users/visibility";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const communityCursorSchema = z.object({
  displayName: z.string(),
  id: z.number().int().min(1),
});

type CommunityPageProps = {
  searchParams: Promise<{
    cursor?: string;
    limit?: string;
  }>;
};

export default async function CommunityDirectoryPage({ searchParams }: CommunityPageProps) {
  const hasPublicDirectory = await isFeatureEnabled("FEATURE_PUBLIC_DIRECTORY");

  if (!hasPublicDirectory) {
    return (
      <main className={styles.page}>
        <MembersBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Community Directory" },
          ]}
          context="public"
          activeSection="community"
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

  const query = await searchParams;
  const limit = parsePageLimit(query.limit);
  const parsedCursor = decodeCursor(query.cursor, communityCursorSchema);
  if (parsedCursor.error) {
    return (
      <main className={styles.page}>
        <MembersBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Community Directory" },
          ]}
          context="public"
          activeSection="community"
        />
        <section className={styles.empty}>
          <p>Invalid page cursor.</p>
          <Link href="/community">Back to first page</Link>
        </section>
      </main>
    );
  }
  const cursor = parsedCursor.value;

  const rows = await getDb()
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
        inArray(users.role, ["member", "admin", "super_admin"]),
        inArray(users.profileVisibility, ["public", "anonymous"]),
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
    ? `/community?cursor=${encodeURIComponent(pageInfo.nextCursor)}&limit=${pageInfo.limit}`
    : null;

  return (
    <main className={styles.page}>
      <MembersBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Community Directory" },
        ]}
        context="public"
        activeSection="community"
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
                  <h2>{isAnonymousVisibility(member.profileVisibility) ? "Community Member" : member.displayName}</h2>
                  {!isAnonymousVisibility(member.profileVisibility) && member.city ? <p className={styles.city}>{member.city}</p> : null}
                  {!isAnonymousVisibility(member.profileVisibility) && member.bio ? <p className={styles.bio}>{member.bio}</p> : null}
                  <Link href={`/community/${member.id}`}>View profile</Link>
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
