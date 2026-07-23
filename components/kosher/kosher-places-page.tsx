import Link from "next/link";
import { Suspense } from "react";

import { KosherDirectory } from "@/components/kosher/kosher-directory";
import { KosherMapEmbed } from "@/components/kosher/kosher-map-embed";
import styles from "@/components/kosher/kosher-places-page.module.css";
import { NativeShell } from "@/components/navigation/native-shell";
import { KosherInquiryForm } from "@/components/forms/kosher-inquiry-form";
import type { KosherNeighborhood } from "@/lib/kosher/neighborhoods";
import {
  type KosherDirectoryFreshnessKey,
  getKosherDirectoryLastUpdated,
  getManagedKosherPlaces,
} from "@/lib/kosher/store";

type KosherPlacesPageProps = {
  currentPath: string;
  heading: string;
  /** Optional short page note. Prefer empty so old-site headings stay dominant. */
  description?: string;
  defaultNeighborhood: KosherNeighborhood | "all";
  lastUpdatedKey?: KosherDirectoryFreshnessKey;
  kicker?: string;
  contactTitle?: string;
  contactDescription?: string;
};

// Verbatim from the old mekorhabracha.org kosher neighborhood pages — do not paraphrase.
const DEFAULT_CONTACT_TITLE = "Get in Touch About Local Kashrut";
const DEFAULT_CONTACT_DESCRIPTION =
  "Have questions, updates, or suggestions regarding our list of kosher-certified establishments? Send us a message—we'd love to hear from you!";

function formatLastUpdatedDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  // Old site used YYYY-MM-DD (e.g. Last Updated: 2025-11-25).
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function KosherPlacesPage({
  currentPath,
  heading,
  description,
  defaultNeighborhood,
  lastUpdatedKey,
  kicker = "Kosher Restaurants",
  contactTitle = DEFAULT_CONTACT_TITLE,
  contactDescription = DEFAULT_CONTACT_DESCRIPTION,
}: KosherPlacesPageProps) {
  let places: Awaited<ReturnType<typeof getManagedKosherPlaces>> = [];
  let rawLastUpdated: string | null = null;
  if (process.env.DATABASE_URL) {
    const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          setTimeout(() => reject(new Error("Kosher data load timed out")), ms);
        }),
      ]);

    try {
      places = await withTimeout(getManagedKosherPlaces(), 5000);
    } catch {
      places = [];
    }
    if (lastUpdatedKey) {
      try {
        rawLastUpdated = await withTimeout(getKosherDirectoryLastUpdated(lastUpdatedKey), 2500);
      } catch {
        rawLastUpdated = null;
      }
    }
  }
  const lastUpdatedDate = formatLastUpdatedDate(rawLastUpdated);
  const defaultNeighborhoodLabel =
    defaultNeighborhood === "all"
      ? ""
      : places.find((place) => place.neighborhood === defaultNeighborhood)?.neighborhoodLabel ?? "";

  return (
    <NativeShell currentPath={currentPath}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <div>
              {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
              <h1 className={styles.title}>{heading}</h1>
              {description ? <p className={styles.description}>{description}</p> : null}
              {lastUpdatedDate ? <p className={styles.meta}>Last Updated: {lastUpdatedDate}</p> : null}
            </div>
            <div className={styles.actions}>
              <a href="#directory" className={styles.actionPrimary}>
                Browse listings
              </a>
              <a href="#map" className={styles.actionSecondary}>
                Kosher Map
              </a>
            </div>
          </div>
        </header>

        <Suspense fallback={<div id="directory" className={styles.panel}>Loading listings…</div>}>
          <KosherDirectory places={places} defaultNeighborhood={defaultNeighborhood} />
        </Suspense>

        <section id="map" className={styles.mapLayout} aria-labelledby="kosher-map-title">
          <div className={styles.panel}>
            <h2 id="kosher-map-title" className={styles.panelTitle}>
              Kosher Map
            </h2>
            <div className={styles.actions}>
              <a href="#directory" className={styles.actionSecondary}>
                Back to listings
              </a>
              <Link href="/kosher-map" className={styles.actionPrimary}>
                Open full map page
              </Link>
            </div>
          </div>
          <div className={styles.mapFrame}>
            <KosherMapEmbed places={places} />
          </div>
        </section>

        <section id="contact" className={styles.panel} aria-labelledby="kosher-contact-title">
          <h2 id="kosher-contact-title" className={styles.panelTitle}>
            {contactTitle}
          </h2>
          <p className={styles.panelBody}>{contactDescription}</p>
          <div className={styles.actions}>
            <Link href="/ask-mekor" className={styles.actionSecondary}>
              Ask Mekor
            </Link>
          </div>
          <KosherInquiryForm sourcePath={currentPath} defaultNeighborhoodLabel={defaultNeighborhoodLabel} />
        </section>
      </div>
    </NativeShell>
  );
}
