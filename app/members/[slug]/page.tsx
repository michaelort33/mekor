import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NativeShell } from "@/components/navigation/native-shell";
import { getPublicMemberProfileBySlug } from "@/lib/members/store";
import { getPublicViewerContext } from "@/lib/members/viewer";
import styles from "./page.module.css";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const viewer = await getPublicViewerContext();
  const profile = await getPublicMemberProfileBySlug(slug, viewer);

  if (!profile) {
    return {
      title: "Member Profile | Mekor Habracha",
      robots: "noindex, nofollow",
    };
  }

  return {
    title: `${profile.displayName} | Member Directory | Mekor Habracha`,
    description: profile.bio || "Community member profile",
    robots: profile.isAnonymous ? "noindex, nofollow" : "index, follow",
  };
}

export default async function MemberProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const viewer = await getPublicViewerContext();
  const profile = await getPublicMemberProfileBySlug(slug, viewer);

  if (!profile) {
    notFound();
  }

  return (
    <NativeShell currentPath="/members" className={styles.shell} contentClassName={styles.content}>
      <article className={styles.card}>
        <header className={styles.header}>
          <div className={styles.avatar} aria-hidden="true">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" />
            ) : (
              profile.displayName.slice(0, 1)
            )}
          </div>
          <div>
            <h1>{profile.displayName}</h1>
            {profile.city ? <p className={styles.city}>{profile.city}</p> : null}
          </div>
        </header>

        {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}

        {profile.interests.length > 0 ? (
          <section>
            <h2>Interests</h2>
            <ul className={styles.interests}>
              {profile.interests.map((interest) => (
                <li key={interest}>{interest}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {!profile.isAnonymous && (profile.email || profile.phone) ? (
          <section className={styles.contact}>
            <h2>Contact</h2>
            {profile.email ? <p>Email: {profile.email}</p> : null}
            {profile.phone ? <p>Phone: {profile.phone}</p> : null}
          </section>
        ) : null}

        <Link href="/members" className={styles.backLink}>
          ← Back to directory
        </Link>
      </article>
    </NativeShell>
  );
}
