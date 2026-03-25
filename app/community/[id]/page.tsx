import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { MembersBreadcrumbs } from "@/components/members/members-breadcrumbs";
import { canAccessMembersArea, getSessionAccountAccess } from "@/lib/auth/account-access";
import { isFeatureEnabled } from "@/lib/config/features";
import {
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

export default async function CommunityProfilePage({ params }: PageProps) {
  const accountAccess = await getSessionAccountAccess();

  if (!(await isFeatureEnabled("FEATURE_PUBLIC_DIRECTORY"))) {
    if (accountAccess && canAccessMembersArea(accountAccess)) {
      redirect("/members");
    }

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
          <p>
            {accountAccess?.accessState === "pending_approval"
              ? "Your account is pending approval as a member. You can manage your account while Mekor reviews your application."
              : accountAccess?.accessState === "declined"
                ? "Your last membership application was not approved. Please contact Mekor if you want to reapply."
                : "Public directory is temporarily unavailable. Sign in to access the Members Directory."}
          </p>
        </header>
        <section className={styles.empty}>
          <Link href={accountAccess ? "/account" : "/members"}>
            {accountAccess ? "Open your account" : "Go to Members Directory"}
          </Link>
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
      profileDetails: users.profileDetailsJson,
      profileFieldVisibility: users.profileFieldVisibilityJson,
      profileVisibility: users.profileVisibility,
    })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        inArray(users.role, ["member", "admin", "super_admin"]),
        inArray(users.profileVisibility, ["public", "anonymous"]),
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
        audience: "public",
      }) || "Community Member";
  const city = anonymous
    ? ""
    : getVisibleProfileValue({
        value: member.city,
        profileVisibility: member.profileVisibility,
        fieldVisibility: fieldVisibility.city,
        audience: "public",
      });
  const bio = anonymous
    ? ""
    : getVisibleProfileValue({
        value: member.bio,
        profileVisibility: member.profileVisibility,
        fieldVisibility: fieldVisibility.bio,
        audience: "public",
      });
  const avatarUrl = anonymous
    ? ""
    : getVisibleProfileValue({
        value: member.avatarUrl,
        profileVisibility: member.profileVisibility,
        fieldVisibility: fieldVisibility.avatarUrl,
        audience: "public",
      });
  const extraFields = anonymous
    ? []
    : [
        { label: "School", value: getVisibleProfileValue({ value: details.school, profileVisibility: member.profileVisibility, fieldVisibility: fieldVisibility.school, audience: "public" }) },
        { label: "Occupation", value: getVisibleProfileValue({ value: details.occupation, profileVisibility: member.profileVisibility, fieldVisibility: fieldVisibility.occupation, audience: "public" }) },
        { label: "Interests", value: getVisibleProfileValue({ value: details.interests, profileVisibility: member.profileVisibility, fieldVisibility: fieldVisibility.interests, audience: "public" }) },
        { label: "Hobbies", value: getVisibleProfileValue({ value: details.hobbies, profileVisibility: member.profileVisibility, fieldVisibility: fieldVisibility.hobbies, audience: "public" }) },
        { label: "Fun facts", value: getVisibleProfileValue({ value: details.funFacts, profileVisibility: member.profileVisibility, fieldVisibility: fieldVisibility.funFacts, audience: "public" }) },
      ].filter((item) => item.value);

  return (
    <main className={styles.page}>
      <MembersBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Community Directory", href: "/community" },
          { label: "Profile" },
        ]}
        context="public"
        activeSection="community"
      />

      <article className={styles.card}>
        <header className={styles.header}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={`${displayName} avatar`} className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder} aria-hidden="true">
              {(anonymous ? "C" : displayName).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1>{displayName}</h1>
            {city ? <p className={styles.city}>{city}</p> : null}
          </div>
        </header>

        {bio ? <p className={styles.bio}>{bio}</p> : anonymous ? null : <p className={styles.bio}>No bio provided.</p>}

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

        <Link href="/community" className={styles.backLink}>
          ← Back to directory
        </Link>
      </article>
    </main>
  );
}
