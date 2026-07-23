import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { MessageMemberButton } from "@/components/members/message-member-button";
import { MembersBreadcrumbs } from "@/components/members/members-breadcrumbs";
import { getUserSession } from "@/lib/auth/session";
import {
  directoryRoleLabel,
  getVisibleProfileValue,
  normalizeProfileDetails,
  normalizeProfileFieldVisibility,
} from "@/lib/users/profile";
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
      profileDetails: users.profileDetailsJson,
      profileFieldVisibility: users.profileFieldVisibilityJson,
      role: users.role,
      profileVisibility: users.profileVisibility,
    })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        inArray(users.role, ["member", "admin", "super_admin"]),
        inArray(users.profileVisibility, ["members", "public", "anonymous"]),
      ),
    )
    .limit(1);

  if (!member) {
    notFound();
  }

  const anonymous = isAnonymousVisibility(member.profileVisibility);
  const fieldVisibility = normalizeProfileFieldVisibility(member.profileFieldVisibility);
  const details = normalizeProfileDetails(member.profileDetails);
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
  const extraFields = anonymous
    ? []
    : [
        {
          label: "School",
          value: getVisibleProfileValue({
            value: details.school,
            profileVisibility: member.profileVisibility,
            fieldVisibility: fieldVisibility.school,
            audience: "members",
          }),
        },
        {
          label: "Occupation",
          value: getVisibleProfileValue({
            value: details.occupation,
            profileVisibility: member.profileVisibility,
            fieldVisibility: fieldVisibility.occupation,
            audience: "members",
          }),
        },
        {
          label: "Interests",
          value: getVisibleProfileValue({
            value: details.interests,
            profileVisibility: member.profileVisibility,
            fieldVisibility: fieldVisibility.interests,
            audience: "members",
          }),
        },
        {
          label: "Hobbies",
          value: getVisibleProfileValue({
            value: details.hobbies,
            profileVisibility: member.profileVisibility,
            fieldVisibility: fieldVisibility.hobbies,
            audience: "members",
          }),
        },
        {
          label: "Fun facts",
          value: getVisibleProfileValue({
            value: details.funFacts,
            profileVisibility: member.profileVisibility,
            fieldVisibility: fieldVisibility.funFacts,
            audience: "members",
          }),
        },
      ].filter((item) => item.value);

  const isSelf = member.id === session.userId;

  return (
    <main className={styles.page}>
      <MembersBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Members", href: "/members" },
          { label: displayName },
        ]}
        context="member"
        activeSection="members"
      />

      <article className={styles.card}>
        <header className={styles.header}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder} aria-hidden="true">
              {(anonymous ? "C" : displayName).charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.headerText}>
            {!anonymous && directoryRoleLabel(member.role) ? (
              <p className={styles.role}>{directoryRoleLabel(member.role)}</p>
            ) : null}
            <h1>{displayName}</h1>
            {city ? <p className={styles.city}>{city}</p> : null}
            <div className={styles.actions}>
              {!isSelf ? (
                <MessageMemberButton recipientUserId={member.id} label={`Message ${displayName}`} />
              ) : (
                <>
                  <Link href="/account/profile#directory-visibility" className={styles.secondaryLink}>
                    Edit your visibility
                  </Link>
                  <span className={styles.selfNote}>This is your directory profile</span>
                </>
              )}
              <Link href="/account/inbox" className={styles.secondaryLink}>
                Open inbox
              </Link>
            </div>
          </div>
        </header>

        {bio ? (
          <p className={styles.bio}>{bio}</p>
        ) : anonymous ? null : (
          <p className={styles.bioMuted}>No bio provided.</p>
        )}

        {extraFields.length > 0 ? (
          <dl className={styles.detailsList}>
            {extraFields.map((item) => (
              <div key={item.label} className={styles.detailRow}>
                <dt className={styles.detailLabel}>{item.label}</dt>
                <dd className={styles.detailValue}>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <Link href="/members" className={styles.backLink}>
          ← Back to members
        </Link>
      </article>
    </main>
  );
}
