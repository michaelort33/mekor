import Link from "next/link";
import { and, asc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { MessageMemberButton } from "@/components/members/message-member-button";
import { MembersBreadcrumbs } from "@/components/members/members-breadcrumbs";
import { getUserSession } from "@/lib/auth/session";
import { decodeCursor, parsePageLimit, toPaginatedResult } from "@/lib/pagination/cursor";
import {
  directoryRoleLabel,
  getVisibleProfileValue,
  normalizeProfileFieldVisibility,
} from "@/lib/users/profile";
import { isAnonymousVisibility } from "@/lib/users/visibility";
import styles from "./page.module.css";

/** Match only fields the members audience is allowed to see (not private / anonymous). */
function searchableField(field: "displayName" | "city" | "bio", pattern: string) {
  let fieldPublic;
  switch (field) {
    case "displayName":
      fieldPublic = sql`coalesce(${users.profileFieldVisibilityJson}->>'displayName', 'public') = 'public'`;
      break;
    case "city":
      fieldPublic = sql`coalesce(${users.profileFieldVisibilityJson}->>'city', 'public') = 'public'`;
      break;
    case "bio":
      fieldPublic = sql`coalesce(${users.profileFieldVisibilityJson}->>'bio', 'public') = 'public'`;
      break;
    default: {
      const _exhaustive: never = field;
      throw new Error(`Unexpected searchable field: ${_exhaustive}`);
    }
  }
  return and(
    inArray(users.profileVisibility, ["members", "public"]),
    fieldPublic,
    ilike(users[field], `%${pattern}%`),
  );
}

export const dynamic = "force-dynamic";

const membersCursorSchema = z.object({
  displayName: z.string(),
  id: z.number().int().min(1),
});

type MembersPageProps = {
  searchParams: Promise<{
    cursor?: string;
    limit?: string;
    q?: string;
  }>;
};

function sanitizeSearch(raw: string | undefined) {
  return (raw ?? "").trim().slice(0, 80).replace(/[%_]/g, "");
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const session = await getUserSession();
  if (!session) {
    redirect("/login?next=/members");
  }

  const query = await searchParams;
  const limit = parsePageLimit(query.limit);
  const search = sanitizeSearch(query.q);
  const parsedCursor = decodeCursor(query.cursor, membersCursorSchema);
  if (parsedCursor.error) {
    redirect(search ? `/members?q=${encodeURIComponent(search)}` : "/members");
  }
  const cursor = parsedCursor.value;

  const searchFilter = search
    ? or(searchableField("displayName", search), searchableField("city", search), searchableField("bio", search))
    : undefined;

  const rows = await getDb()
    .select({
      id: users.id,
      displayName: users.displayName,
      bio: users.bio,
      city: users.city,
      avatarUrl: users.avatarUrl,
      profileFieldVisibility: users.profileFieldVisibilityJson,
      role: users.role,
      profileVisibility: users.profileVisibility,
    })
    .from(users)
    .where(
      and(
        inArray(users.role, ["member", "admin", "super_admin"]),
        inArray(users.profileVisibility, ["members", "public", "anonymous"]),
        searchFilter,
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

  const nextParams = new URLSearchParams();
  if (pageInfo.nextCursor) nextParams.set("cursor", pageInfo.nextCursor);
  nextParams.set("limit", String(pageInfo.limit));
  if (search) nextParams.set("q", search);
  const nextUrl = pageInfo.nextCursor ? `/members?${nextParams.toString()}` : null;

  return (
    <main className={styles.page}>
      <MembersBreadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Members" }]}
        context="member"
        activeSection="members"
      />

      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1>Find members</h1>
          <p>
            Browse community members who chose to be visible. Open a profile or message them
            directly.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/account/inbox" className={styles.secondaryAction}>
            Open inbox
          </Link>
          <Link href="/account/profile#directory-visibility" className={styles.secondaryAction}>
            Your visibility
          </Link>
        </div>
      </header>

      <form className={styles.searchBar} method="get" action="/members" role="search">
        <label className={styles.searchLabel} htmlFor="member-search">
          Search members
        </label>
        <div className={styles.searchRow}>
          <input
            id="member-search"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Search by name, city, or bio…"
            className={styles.searchInput}
            autoComplete="off"
            maxLength={80}
          />
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
          {search ? (
            <Link href="/members" className={styles.clearSearch}>
              Clear
            </Link>
          ) : null}
        </div>
        <p className={styles.searchHint}>
          Search matches only fields each member chose to show. Anonymous and private fields are excluded.
        </p>
      </form>

      {members.length === 0 ? (
        <section className={styles.empty}>
          <h2>{search ? "No matches" : "No visible members yet"}</h2>
          <p>
            {search
              ? `Nothing matched “${search}”. Try a different name or city, or clear the search.`
              : "When members set directory visibility to Members only or Public, they show up here."}
          </p>
          <div className={styles.emptyActions}>
            {search ? <Link href="/members">Clear search</Link> : null}
            <Link href="/account/profile#directory-visibility">Update your profile visibility</Link>
            <Link href="/account/inbox">Go to inbox</Link>
          </div>
        </section>
      ) : (
        <>
          <p className={styles.resultCount} aria-live="polite">
            Showing {members.length}
            {pageInfo.nextCursor ? "+" : ""} member{members.length === 1 ? "" : "s"}
            {search ? ` matching “${search}”` : ""}
          </p>
          <section className={styles.grid} aria-label="Visible members">
            {members.map((member) => {
              const anonymous = isAnonymousVisibility(member.profileVisibility);
              const fieldVisibility = normalizeProfileFieldVisibility(member.profileFieldVisibility);
              const displayName = anonymous
                ? "Community Member"
                : getVisibleProfileValue({
                    value: member.displayName,
                    profileVisibility: member.profileVisibility,
                    fieldVisibility: fieldVisibility.displayName,
                    audience: "members",
                  }) || "Community Member";
              const city = anonymous
                ? ""
                : getVisibleProfileValue({
                    value: member.city,
                    profileVisibility: member.profileVisibility,
                    fieldVisibility: fieldVisibility.city,
                    audience: "members",
                  });
              const bio = anonymous
                ? ""
                : getVisibleProfileValue({
                    value: member.bio,
                    profileVisibility: member.profileVisibility,
                    fieldVisibility: fieldVisibility.bio,
                    audience: "members",
                  });
              const avatarUrl = anonymous
                ? ""
                : getVisibleProfileValue({
                    value: member.avatarUrl,
                    profileVisibility: member.profileVisibility,
                    fieldVisibility: fieldVisibility.avatarUrl,
                    audience: "members",
                  });
              const isSelf = member.id === session.userId;

              return (
                <article key={member.id} className={styles.card}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className={styles.avatar} />
                  ) : (
                    <div className={styles.avatarPlaceholder} aria-hidden="true">
                      {(anonymous ? "C" : displayName).charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className={styles.body}>
                    {!anonymous && directoryRoleLabel(member.role) ? (
                      <p className={styles.role}>{directoryRoleLabel(member.role)}</p>
                    ) : null}
                    <h2>{displayName}</h2>
                    {city ? <p className={styles.city}>{city}</p> : null}
                    {bio ? <p className={styles.bio}>{bio}</p> : null}
                    <div className={styles.cardActions}>
                      <Link href={`/members/${member.id}`} className={styles.profileLink}>
                        View profile
                      </Link>
                      {!isSelf ? (
                        <MessageMemberButton
                          recipientUserId={member.id}
                          label="Message"
                          variant="secondary"
                        />
                      ) : (
                        <span className={styles.selfNote}>That’s you</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
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
