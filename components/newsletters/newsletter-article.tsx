import type { ElementType } from "react";
import Link from "next/link";

import {
  formatNewsletterDate,
  NEWSLETTER_CATEGORY_LABELS,
  type Newsletter,
  type NewsletterBlock,
  type NewsletterContentNode,
} from "@/lib/newsletters/data";
import styles from "./newsletter-article.module.css";

function isInternal(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function LinkTarget({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return isInternal(href) ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

const ELEMENT_TAGS: Record<string, ElementType> = {
  div: "div",
  p: "p",
  span: "span",
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  u: "u",
  ul: "ul",
  ol: "ol",
  li: "li",
  table: "table",
  tbody: "tbody",
  tr: "tr",
  td: "td",
  h1: "h2",
  h2: "h3",
  h3: "h4",
  font: "span",
  center: "div",
};

function ContentNode({ node }: { node: NewsletterContentNode }) {
  if (node.type === "text") return node.value;
  if (node.type === "break") return <br />;
  if (node.type === "image") {
    // Imported newsletter assets are local and keep their original aspect ratios.
    return <img src={node.src} alt={node.alt} loading="lazy" className={styles.inlineImage} />;
  }
  if (node.type === "link") {
    return (
      <LinkTarget href={node.href} className={styles.link}>
        {node.children.map((child, index) => (
          <ContentNode node={child} key={index} />
        ))}
      </LinkTarget>
    );
  }

  const Tag = ELEMENT_TAGS[node.tag] ?? "span";
  const className = [
    styles.richElement,
    styles[`tag-${node.tag}`],
    node.align ? styles[`align-${node.align}`] : "",
    node.variant ? styles[`variant-${node.variant}`] : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={className} id={node.id}>
      {node.children.map((child, index) => (
        <ContentNode node={child} key={index} />
      ))}
    </Tag>
  );
}

function Block({ block }: { block: NewsletterBlock }) {
  if (block.kind === "divider") return <hr className={styles.divider} />;

  if (block.kind === "image") {
    const image = (
      <img src={block.node.src} alt={block.node.alt} loading="lazy" className={styles.image} />
    );
    return block.href ? (
      <LinkTarget href={block.href} className={styles.imageLink}>
        {image}
      </LinkTarget>
    ) : (
      image
    );
  }

  if (block.kind === "button") {
    return (
      <div className={styles.buttonRow}>
        <LinkTarget href={block.href} className={styles.button}>
          {block.label}
        </LinkTarget>
      </div>
    );
  }

  if (block.kind === "links") {
    return (
      <nav className={styles.originalLinks} aria-label="Links from the original newsletter">
        {block.links.map((item) => (
          <LinkTarget href={item.href} key={`${item.label}-${item.href}`}>
            {item.label}
          </LinkTarget>
        ))}
      </nav>
    );
  }

  return (
    <div className={styles.rich}>
      {block.nodes.map((node, index) => (
        <ContentNode node={node} key={index} />
      ))}
    </div>
  );
}

export function NewsletterArticle({ newsletter }: { newsletter: Newsletter }) {
  return (
    <article className={styles.article}>
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <span>{NEWSLETTER_CATEGORY_LABELS[newsletter.category]}</span>
          <time dateTime={newsletter.sentOn}>{formatNewsletterDate(newsletter.sentOn)}</time>
          <span>{newsletter.readingMinutes} min read</span>
        </div>
        <h1>{newsletter.title}</h1>
        {newsletter.campaignId.startsWith("native-") ? null : <p>Preserved from the original Mekor Habracha email archive. The wording below is unchanged and all newsletter images are stored on this site.</p>}
      </header>
      <div className={styles.body}>
        {newsletter.bodyHtml ? <div dangerouslySetInnerHTML={{ __html: newsletter.bodyHtml }} /> : newsletter.blocks.map((block, index) => <Block block={block} key={index} />)}
      </div>
    </article>
  );
}
