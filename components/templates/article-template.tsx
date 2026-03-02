import Image from "next/image";
import Link from "next/link";

import { SiteNavigation } from "@/components/navigation/site-navigation";
import type { ArticleTemplateData } from "@/lib/templates/template-data";

type ArticleTemplateProps = {
  data: ArticleTemplateData;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

export function ArticleTemplate({ data }: ArticleTemplateProps) {
  return (
    <main className="template-page template-page--article" data-native-nav="true">
      <SiteNavigation currentPath={data.path} />

      <article className="template-card">
        <header className="template-card__header">
          <p className="template-card__eyebrow">{data.type === "post" ? "Kosher Listing" : "News"}</p>
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
          {data.metadata.length > 0 ? (
            <p className="template-card__meta">{data.metadata.join(" • ")}</p>
          ) : null}
        </header>

        {data.heroImage ? (
          <div className="template-card__hero">
            <Image
              src={data.heroImage}
              alt={data.title}
              width={1200}
              height={675}
              sizes="(max-width: 920px) 100vw, 920px"
            />
          </div>
        ) : null}

        {data.facts.length > 0 ? (
          <dl className="template-facts">
            {data.facts.map((fact) => (
              <div key={`${fact.label}:${fact.value}`}>
                <dt>{fact.label}</dt>
                <dd>
                  {fact.href ? (
                    isExternalHref(fact.href) ? (
                      <a href={fact.href} target="_blank" rel="noreferrer noopener">
                        {fact.value}
                      </a>
                    ) : (
                      <Link href={fact.href}>{fact.value}</Link>
                    )
                  ) : (
                    fact.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <section className="template-content" aria-label="Article content">
          {data.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>

        {data.categories.length > 0 ? (
          <section className="template-chip-list" aria-label="Categories">
            <h2>Categories</h2>
            <div>
              {data.categories.map((category) => (
                <Link key={category.href} href={category.href} className="template-chip">
                  {category.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {data.tags.length > 0 ? (
          <section className="template-chip-list" aria-label="Tags">
            <h2>Tags</h2>
            <div>
              {data.tags.map((tag) => (
                <Link key={tag.href} href={tag.href} className="template-chip">
                  {tag.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {data.sourceUrl ? (
          <p className="template-card__source">
            Source:{" "}
            <a href={data.sourceUrl} target="_blank" rel="noreferrer noopener">
              {data.sourceUrl}
            </a>
          </p>
        ) : null}
      </article>
    </main>
  );
}
