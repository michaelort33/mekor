import Link from "next/link";

import type { Newsletter, NewsletterBlock, NewsletterRich } from "@/lib/newsletters/data";
import styles from "./newsletter-article.module.css";

function isInternal(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function RichText({ value }: { value: NewsletterRich }) {
  return (
    <>
      {value.map((part, index) => {
        if (typeof part === "string") {
          return <span key={index}>{part}</span>;
        }
        if (!part.href) {
          return <span key={index}>{part.text}</span>;
        }
        if (isInternal(part.href)) {
          return (
            <Link key={index} href={part.href} className={styles.link}>
              {part.text}
            </Link>
          );
        }
        return (
          <a key={index} href={part.href} target="_blank" rel="noreferrer noopener" className={styles.link}>
            {part.text}
          </a>
        );
      })}
    </>
  );
}

function Block({ block, embedded }: { block: NewsletterBlock; embedded: boolean }) {
  switch (block.kind) {
    case "image":
      // External Mailchimp-hosted images kept verbatim; plain img avoids remote-domain config.
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={block.src} alt={block.alt} loading="lazy" className={styles.image} />;

    case "section": {
      const SectionTag = embedded ? "h3" : "h2";
      return <SectionTag className={styles.sectionHeading}>{block.title}</SectionTag>;
    }

    case "paragraph": {
      const className = [
        styles.paragraph,
        block.align === "center" ? styles.center : "",
        block.italic ? styles.italic : "",
        block.strong ? styles.strong : "",
        block.small ? styles.small : "",
      ]
        .filter(Boolean)
        .join(" ");
      return (
        <p className={className}>
          <RichText value={block.text} />
        </p>
      );
    }

    case "schedule":
      return (
        <div className={styles.schedule}>
          {block.heading ? <p className={styles.scheduleHeading}>{block.heading}</p> : null}
          <dl className={styles.scheduleRows}>
            {block.rows.map((row, index) => (
              <div className={styles.scheduleRow} key={index}>
                <dt className={styles.scheduleTime}>{row.time}</dt>
                <dd className={styles.scheduleLabel}>
                  <RichText value={row.label} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );

    case "list":
      return (
        <ul className={styles.list}>
          {block.items.map((item, index) => (
            <li key={index}>
              <RichText value={item} />
            </li>
          ))}
        </ul>
      );

    case "button":
      return isInternal(block.href) ? (
        <Link href={block.href} className={styles.button}>
          {block.label}
        </Link>
      ) : (
        <a href={block.href} target="_blank" rel="noreferrer noopener" className={styles.button}>
          {block.label}
        </a>
      );

    case "links":
      return (
        <div className={styles.linkRow}>
          {block.items.map((item) =>
            isInternal(item.href) ? (
              <Link key={item.label} href={item.href} className={styles.linkChip}>
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} target="_blank" rel="noreferrer noopener" className={styles.linkChip}>
                {item.label}
              </a>
            ),
          )}
        </div>
      );

    default:
      return null;
  }
}

export function NewsletterArticle({
  newsletter,
  embedded = false,
}: {
  newsletter: Newsletter;
  embedded?: boolean;
}) {
  const TitleTag = embedded ? "h2" : "h1";
  return (
    <article className={styles.article}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Weekly Newsletter</p>
        <TitleTag className={styles.title}>{newsletter.parsha}</TitleTag>
        <p className={styles.dateLine}>
          {newsletter.dateRange}
          <span className={styles.dot} aria-hidden="true">
            ·
          </span>
          {newsletter.hebrewDate}
        </p>
      </header>

      {newsletter.leadImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={newsletter.leadImage} alt={`${newsletter.parsha} graphic`} className={styles.leadImage} />
      ) : null}

      <div className={styles.body}>
        {newsletter.blocks.map((block, index) => (
          <Block key={index} block={block} embedded={embedded} />
        ))}
      </div>
    </article>
  );
}
