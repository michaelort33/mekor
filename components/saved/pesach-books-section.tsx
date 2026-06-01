import Image from "next/image";

import styles from "./pesach-books-section.module.css";

const PESACH_WITHOUT_THE_PAIN_URL = "https://www.pesachwithoutthepain.com/";
const BRINGING_ORDER_TO_THE_SEDER_URL = "https://www.pesachwithoutthepain.com/botts/";

const PESACH_BOOKS = [
  {
    author: "Rabbi Eliezer Hirsch",
    title: "Pesach Without the Pain",
    description: "A practical guide to the laws and practices of Passover",
    href: PESACH_WITHOUT_THE_PAIN_URL,
    image:
      "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/1f897563102c2e1f396fc9fb00285908480ae65d-pwop-ebook-cover_DuQZD75l.png",
  },
  {
    author: "Rabbi Eliezer Hirsch",
    title: "Bringing Order to the Seder",
    description: "A Modern Guide to the Traditional Passover Haggadah",
    href: BRINGING_ORDER_TO_THE_SEDER_URL,
    image:
      "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/7a8617da5ad0c2f1c00e8a7567ab90d43042b5d7-botts-cover.jpg",
  },
] as const;

/**
 * Saved component: Rabbi Eliezer Hirsch — Pesach books.
 *
 * Self-contained promo section (markup, data, and styles). Previously lived on
 * the homepage; pulled out so it can be dropped back into any page when needed:
 *
 *   import { PesachBooksSection } from "@/components/saved/pesach-books-section";
 *   ...
 *   <PesachBooksSection />
 */
export function PesachBooksSection() {
  return (
    <section className={styles.bookSection}>
      <div className={styles.container}>
        <div className={styles.bookSectionHeader}>
          <h2 className={styles.bookSectionTitle}>Rabbi Eliezer Hirsch - Pesach books</h2>
          <div className={styles.bookSectionDivider} />
          <p className={styles.bookSectionIntro}>
            Explore both practical guides to Pesach from preparation to the Seder.
          </p>
        </div>

        <div className={styles.bookGrid}>
          {PESACH_BOOKS.map((book) => (
            <article key={book.title} className={styles.bookItem}>
              <div className={styles.bookCoverWrap}>
                <Image src={book.image} alt={book.title} width={165} height={240} className={styles.bookCover} />
              </div>
              <p className={styles.bookAuthor}>{book.author}</p>
              <h3 className={styles.bookItemTitle}>{book.title}</h3>
              <p className={styles.bookItemDescription}>{book.description}</p>
              <a href={book.href} target="_blank" rel="noreferrer noopener" className={styles.bookButton}>
                Read Now
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
