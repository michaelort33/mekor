"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const ELFSIGHT_APP_CLASS = "elfsight-app-94318b42-b410-4983-8c4e-1eae94a93212";
const LEGACY_MAP_SRC =
  "https://www-mekorhabracha-org.filesusr.com/html/92f487_18faae6f3d17c0bfced150d83fa167cd.html";
const WIDGET_READY_TIMEOUT_MS = 6000;

function hasWidgetMounted(container: HTMLElement) {
  return (
    container.childElementCount > 0 ||
    Boolean(container.querySelector("iframe, [class*='elfsight'], [id*='elfsight']"))
  );
}

export function KosherMapEmbed() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptErrored, setScriptErrored] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);

  useEffect(() => {
    if (!scriptLoaded || scriptErrored) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (hasWidgetMounted(container)) {
      const readyTimeoutId = window.setTimeout(() => {
        setWidgetReady(true);
      }, 0);

      return () => {
        window.clearTimeout(readyTimeoutId);
      };
    }

    const observer = new MutationObserver(() => {
      if (!hasWidgetMounted(container)) {
        return;
      }

      setWidgetReady(true);
    });

    observer.observe(container, { childList: true, subtree: true });

    const timeoutId = window.setTimeout(() => {
      if (!hasWidgetMounted(container)) {
        setScriptErrored(true);
      }
    }, WIDGET_READY_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [scriptLoaded, scriptErrored]);

  const shouldShowFallback = scriptErrored;

  return (
    <section className="kosher-map-embed" aria-label="Kosher map">
      <Script
        src="https://elfsightcdn.com/platform.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setScriptErrored(true)}
      />

      <div
        ref={containerRef}
        className={ELFSIGHT_APP_CLASS}
        data-elfsight-app-lazy=""
        data-mekor-native-kosher-map="true"
        aria-hidden={shouldShowFallback ? "true" : "false"}
      />

      {!scriptErrored && !widgetReady ? (
        <p className="kosher-map-embed__loading">Loading kosher map...</p>
      ) : null}

      {shouldShowFallback ? (
        <div className="kosher-map-embed__fallback">
          <p>
            The interactive map is temporarily unavailable. You can still browse kosher places below or use
            the legacy map.
          </p>
          <iframe
            title="Kosher map fallback"
            src={LEGACY_MAP_SRC}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="kosher-map-embed__fallback-links">
            <Link href="/center-city">Center City &amp; Vicinity</Link>
            <Link href="/main-line-manyunk">Main Line / Manyunk</Link>
            <Link href="/old-yorkroad-northeast">Old York Road / Northeast</Link>
            <Link href="/cherry-hill">Cherry Hill</Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
