import Link from "next/link";

import { SiteNavigation } from "@/components/navigation/site-navigation";
import type { ArchiveTemplateData } from "@/lib/templates/template-data";

type ArchiveTemplateProps = {
  data: ArchiveTemplateData;
};

export function ArchiveTemplate({ data }: ArchiveTemplateProps) {
  return (
    <main className="template-page template-page--archive" data-native-nav="true">
      <SiteNavigation currentPath={data.path} />

      <section className="template-card">
        <header className="template-card__header">
          <p className="template-card__eyebrow">{data.type === "category" ? "Category" : "Tag"}</p>
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
          {data.currentPage > 1 ? (
            <p className="template-card__meta">Page {data.currentPage}</p>
          ) : null}
        </header>

        {data.entries.length === 0 ? (
          <p className="template-card__empty">No post entries were found for this archive page.</p>
        ) : (
          <div className="template-archive-grid">
            {data.entries.map((entry) => (
              <article key={entry.path} className="template-archive-card">
                <h2>
                  <Link href={entry.path}>{entry.title}</Link>
                </h2>
                {entry.description ? <p>{entry.description}</p> : null}
              </article>
            ))}
          </div>
        )}

        {data.prevPageHref || data.nextPageHref ? (
          <nav className="template-pagination" aria-label="Archive pagination">
            {data.prevPageHref ? <Link href={data.prevPageHref}>Previous</Link> : <span />}
            {data.nextPageHref ? <Link href={data.nextPageHref}>Next</Link> : <span />}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
