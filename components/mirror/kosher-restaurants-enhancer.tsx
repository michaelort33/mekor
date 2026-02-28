"use client";

import Script from "next/script";
import { useEffect } from "react";

const KOSHER_NEIGHBORHOOD_PATHS = new Set([
  "/center-city",
  "/main-line-manyunk",
  "/old-yorkroad-northeast",
  "/cherry-hill",
]);

const ELFSIGHT_APP_CLASS = "elfsight-app-94318b42-b410-4983-8c4e-1eae94a93212";
const MAP_CONTAINER_ID = "mekor-kosher-map-embed";

type Props = {
  path: string;
};

function normalize(input: string) {
  const value = input.trim();
  if (value === "") {
    return "/";
  }
  return value.startsWith("/") ? value : `/${value}`;
}

export function KosherRestaurantsEnhancer({ path }: Props) {
  const normalizedPath = normalize(path);
  const enabled = KOSHER_NEIGHBORHOOD_PATHS.has(normalizedPath);

  useEffect(() => {
    document.querySelectorAll<HTMLAnchorElement>('a[href="/kosher-posts"]').forEach((link) => {
      link.setAttribute("href", "/center-city");
    });

    if (!enabled) {
      return;
    }

    const mapHeading = Array.from(
      document.querySelectorAll<HTMLHeadingElement>("h1,h2,h3,h4,h5,h6"),
    ).find((heading) => heading.textContent?.trim().toLowerCase() === "kosher map");

    if (!mapHeading) {
      return;
    }

    if (document.getElementById(MAP_CONTAINER_ID)) {
      return;
    }

    const anchor = mapHeading.closest("div.wixui-rich-text") ?? mapHeading;
    const parent = anchor.parentElement;
    if (!parent) {
      return;
    }

    const mapContainer = document.createElement("div");
    mapContainer.id = MAP_CONTAINER_ID;
    mapContainer.className = ELFSIGHT_APP_CLASS;
    mapContainer.setAttribute("data-elfsight-app-lazy", "");
    mapContainer.setAttribute("data-mekor-kosher-map", "true");

    parent.insertBefore(mapContainer, anchor.nextSibling);
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return <Script src="https://elfsightcdn.com/platform.js" strategy="afterInteractive" />;
}
