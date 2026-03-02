import Link from "next/link";

import { SiteNavigation } from "@/components/navigation/site-navigation";
import type { ProfileTemplateData } from "@/lib/templates/template-data";

type ProfileTemplateProps = {
  data: ProfileTemplateData;
};

export function ProfileTemplate({ data }: ProfileTemplateProps) {
  return (
    <main className="template-page template-page--profile" data-native-nav="true">
      <SiteNavigation currentPath={data.path} />

      <article className="template-card">
        <header className="template-card__header">
          <p className="template-card__eyebrow">Profile</p>
          <h1>{data.profileName}</h1>
          <p>{data.subtitle}</p>
          {data.postCount !== null ? (
            <p className="template-card__meta">Posts: {data.postCount}</p>
          ) : null}
        </header>

        <section className="template-content" aria-label="Recent posts">
          <h2>Recent Posts</h2>
          {data.featuredPosts.length === 0 ? (
            <p>No post links are available for this profile.</p>
          ) : (
            <ul className="template-list">
              {data.featuredPosts.map((post) => (
                <li key={post.href}>
                  <Link href={post.href}>{post.label}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </main>
  );
}
