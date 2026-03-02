import Link from "next/link";

import { SiteNavigation } from "@/components/navigation/site-navigation";
import { ContactForm } from "@/components/medium-pages/contact-form";
import type { MediumPageLink, MediumStaticPageConfig } from "@/lib/medium-pages/content";

function ActionLink({ link }: { link: MediumPageLink }) {
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer noopener" className="medium-static-actions__link">
        {link.label}
      </a>
    );
  }

  if (link.href.startsWith("mailto:") || link.href.startsWith("tel:")) {
    return (
      <a href={link.href} className="medium-static-actions__link">
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className="medium-static-actions__link">
      {link.label}
    </Link>
  );
}

function ActionList({ links }: { links: MediumPageLink[] | undefined }) {
  if (!links || links.length === 0) {
    return null;
  }

  return (
    <div className="medium-static-actions">
      {links.map((link) => (
        <ActionLink key={`${link.label}-${link.href}`} link={link} />
      ))}
    </div>
  );
}

function InfoTemplate({ page }: { page: Extract<MediumStaticPageConfig, { archetype: "info" }> }) {
  return (
    <section className="medium-static-shell">
      <header className="medium-static-header">
        {page.eyebrow ? <p className="medium-static-header__eyebrow">{page.eyebrow}</p> : null}
        <h1>{page.title}</h1>
        {page.intro.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <ActionList links={page.primaryLinks} />
        <ActionList links={page.secondaryLinks} />
      </header>

      <div className="medium-static-body">
        {page.sections.map((section) => (
          <article key={section.heading} className="medium-static-section">
            <h2>{section.heading}</h2>

            {section.paragraphs?.map((line) => (
              <p key={line}>{line}</p>
            ))}

            {section.bullets && section.bullets.length > 0 ? (
              <ul>
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            {section.cards && section.cards.length > 0 ? (
              <div className="medium-static-cards">
                {section.cards.map((card) => (
                  <div key={card.title} className="medium-static-card">
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                    {card.links && card.links.length > 0 ? (
                      <div className="medium-static-card__links">
                        {card.links.map((link) => (
                          <ActionLink key={`${link.label}-${link.href}`} link={link} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {section.links && section.links.length > 0 ? <ActionList links={section.links} /> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function ContactTemplate({ page }: { page: Extract<MediumStaticPageConfig, { archetype: "contact" }> }) {
  return (
    <section className="medium-static-shell medium-static-shell--contact">
      <header className="medium-static-header">
        {page.eyebrow ? <p className="medium-static-header__eyebrow">{page.eyebrow}</p> : null}
        <h1>{page.title}</h1>
        {page.intro.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <ActionList links={page.primaryLinks} />
        <ActionList links={page.secondaryLinks} />
      </header>

      <div className="medium-contact-grid">
        <article className="medium-contact-card">
          <h2>Contact details</h2>
          <dl>
            {page.methods.map((method) => (
              <div key={method.label}>
                <dt>{method.label}</dt>
                <dd>
                  {method.href ? <a href={method.href}>{method.value}</a> : method.value}
                </dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="medium-contact-card">
          <h2>Address</h2>
          {page.addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </article>
      </div>

      <article className="medium-contact-form-card">
        <h2>{page.formHeading}</h2>
        <p>{page.formDescription}</p>
        <ContactForm sourcePath={page.sourcePath} />
      </article>
    </section>
  );
}

function DirectoryTemplate({ page }: { page: Extract<MediumStaticPageConfig, { archetype: "directory" }> }) {
  return (
    <section className="medium-static-shell">
      <header className="medium-static-header">
        {page.eyebrow ? <p className="medium-static-header__eyebrow">{page.eyebrow}</p> : null}
        <h1>{page.title}</h1>
        {page.intro.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <ActionList links={page.primaryLinks} />
        <ActionList links={page.secondaryLinks} />
      </header>

      <div className="medium-directory-groups">
        {page.groups.map((group) => (
          <article key={group.heading} className="medium-directory-group">
            <h2>{group.heading}</h2>
            <div className="medium-directory-grid">
              {group.entries.map((entry, index) => (
                <div key={`${entry.title}-${index}`} className="medium-directory-entry">
                  {entry.title ? <h3>{entry.title}</h3> : null}
                  {entry.body ? <p>{entry.body}</p> : null}
                  {entry.quoteBy ? <p className="medium-directory-entry__quote-by">~ {entry.quoteBy}</p> : null}
                  {entry.details && entry.details.length > 0 ? (
                    <ul>
                      {entry.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                  {entry.links && entry.links.length > 0 ? (
                    <div className="medium-directory-entry__links">
                      {entry.links.map((link) => (
                        <ActionLink key={`${link.label}-${link.href}`} link={link} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MediumStaticTemplate({ page }: { page: MediumStaticPageConfig }) {
  return (
    <main className={`medium-static-page medium-static-page--${page.archetype}`} data-native-nav="true">
      <SiteNavigation currentPath={page.path} />

      {page.archetype === "info" ? <InfoTemplate page={page} /> : null}
      {page.archetype === "contact" ? <ContactTemplate page={page} /> : null}
      {page.archetype === "directory" ? <DirectoryTemplate page={page} /> : null}
    </main>
  );
}
