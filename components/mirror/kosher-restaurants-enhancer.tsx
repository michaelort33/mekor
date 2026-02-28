"use client";

import Script from "next/script";
import { useEffect } from "react";

const KOSHER_NEIGHBORHOOD_PATHS = new Set([
  "/center-city",
  "/main-line-manyunk",
  "/old-yorkroad-northeast",
  "/cherry-hill",
]);
const KOSHER_MAP_PATH = "/kosher-map";
const MAP_ENABLED_PATHS = new Set([...KOSHER_NEIGHBORHOOD_PATHS, KOSHER_MAP_PATH]);

const ELFSIGHT_APP_CLASS = "elfsight-app-94318b42-b410-4983-8c4e-1eae94a93212";
const MAP_CONTAINER_ID = "mekor-kosher-map-embed";
const MAP_PAGE_CONTAINER_ID = "mekor-kosher-map-page-embed";
const LEGACY_MAP_IFRAME_FRAGMENT = "92f487_18faae6f3d17c0bfced150d83fa167cd.html";

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

function toRelativeHref(rawHref: string) {
  if (rawHref.startsWith("https://www.mekorhabracha.org")) {
    return rawHref.replace("https://www.mekorhabracha.org", "");
  }
  if (rawHref.startsWith("http://www.mekorhabracha.org")) {
    return rawHref.replace("http://www.mekorhabracha.org", "");
  }
  return rawHref;
}

function closeAllSubmenus() {
  document.querySelectorAll<HTMLLIElement>('nav[aria-label="Site"] li.mirror-native-has-submenu').forEach((item) => {
    item.dataset.open = "false";

    const trigger = item.querySelector<HTMLElement>(':scope > .mirror-native-submenu-trigger[role="button"]');
    const toggle = item.querySelector<HTMLButtonElement>(
      ':scope > .mirror-native-submenu-toggle, :scope > button._pfxlW',
    );

    trigger?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-expanded", "false");
  });
}

function normalizeMainNavSubmenus() {
  const menuItems = document.querySelectorAll<HTMLLIElement>(
    'nav[aria-label="Site"] li.mirror-native-has-submenu',
  );

  menuItems.forEach((item) => {
    const currentTriggerLink = item.querySelector<HTMLAnchorElement>(':scope > a.mirror-native-submenu-trigger');

    if (currentTriggerLink) {
      const trigger = document.createElement("div");
      trigger.className = currentTriggerLink.className;
      trigger.innerHTML = currentTriggerLink.innerHTML;
      trigger.setAttribute("data-testid", currentTriggerLink.getAttribute("data-testid") ?? "linkElement");
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("role", "button");
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      currentTriggerLink.replaceWith(trigger);
    }

    const trigger = item.querySelector<HTMLElement>(':scope > .mirror-native-submenu-trigger[role="button"]');
    const toggle = item.querySelector<HTMLButtonElement>(
      ':scope > .mirror-native-submenu-toggle, :scope > button._pfxlW',
    );

    if (!trigger || !toggle || item.dataset.mirrorSubmenuBound === "true") {
      return;
    }

    const setOpen = (isOpen: boolean) => {
      item.dataset.open = isOpen ? "true" : "false";
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    item.dataset.mirrorSubmenuBound = "true";
    toggle.type = "button";

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = item.dataset.open === "true";
      closeAllSubmenus();
      setOpen(!isOpen);
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const isOpen = item.dataset.open === "true";
        closeAllSubmenus();
        setOpen(!isOpen);
      }
      if (event.key === "Escape") {
        closeAllSubmenus();
      }
    });

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = item.dataset.open === "true";
      closeAllSubmenus();
      setOpen(!isOpen);
    });

    item.addEventListener("mouseenter", () => {
      setOpen(true);
    });

    item.addEventListener("mouseleave", () => {
      setOpen(false);
    });

    item.addEventListener("focusout", (event) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (!nextTarget || !item.contains(nextTarget)) {
        setOpen(false);
      }
    });
  });

  const navRoot = document.querySelector<HTMLElement>('nav[aria-label="Site"]');
  if (!navRoot || navRoot.dataset.mirrorGlobalCloseBound === "true") {
    return;
  }

  navRoot.dataset.mirrorGlobalCloseBound = "true";
  document.addEventListener("click", (event) => {
    if (!navRoot.contains(event.target as Node)) {
      closeAllSubmenus();
    }
  });
}

function findKosherMapHeading() {
  return Array.from(
    document.querySelectorAll<HTMLHeadingElement>("h1,h2,h3,h4,h5,h6"),
  ).find((heading) => heading.textContent?.trim().toLowerCase() === "kosher map");
}

function ensureMapContainer(containerId: string, markMapPage: boolean) {
  const existingContainer =
    document.getElementById(containerId) ??
    document.querySelector<HTMLElement>(`.${ELFSIGHT_APP_CLASS}[data-mekor-kosher-map="true"]`);

  if (existingContainer) {
    if (markMapPage) {
      existingContainer.setAttribute("data-mekor-map-page", "true");
    }
    return;
  }

  const mapHeading = findKosherMapHeading();
  if (!mapHeading) {
    return;
  }

  const anchor = mapHeading.closest("div.wixui-rich-text") ?? mapHeading;
  const parent = anchor.parentElement;
  if (!parent) {
    return;
  }

  const mapContainer = document.createElement("div");
  mapContainer.id = containerId;
  mapContainer.className = ELFSIGHT_APP_CLASS;
  mapContainer.setAttribute("data-elfsight-app-lazy", "");
  mapContainer.setAttribute("data-mekor-kosher-map", "true");
  if (markMapPage) {
    mapContainer.setAttribute("data-mekor-map-page", "true");
  }

  parent.insertBefore(mapContainer, anchor.nextSibling);
}

function applyKosherMapPageFallback() {
  const legacyIframe = document.querySelector<HTMLIFrameElement>(
    `iframe[src*="${LEGACY_MAP_IFRAME_FRAGMENT}"]`,
  );

  if (legacyIframe) {
    const legacyContainer = legacyIframe.closest<HTMLElement>("div.RjABt4, div[id^='comp-']") ?? legacyIframe.parentElement;
    if (legacyContainer) {
      legacyContainer.setAttribute("data-mekor-legacy-map", "hidden");
      legacyContainer.style.display = "none";
      legacyContainer.style.visibility = "hidden";
      legacyContainer.style.height = "0";
      legacyContainer.style.overflow = "hidden";
    }
  }

  ensureMapContainer(MAP_PAGE_CONTAINER_ID, true);
}

export function KosherRestaurantsEnhancer({ path }: Props) {
  const normalizedPath = normalize(path);
  const mapEnabled = MAP_ENABLED_PATHS.has(normalizedPath);
  const neighborhoodEnabled = KOSHER_NEIGHBORHOOD_PATHS.has(normalizedPath);

  useEffect(() => {
    document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
      const rawHref = link.getAttribute("href");
      if (!rawHref) {
        return;
      }

      const relativeHref = toRelativeHref(rawHref);
      if (relativeHref !== rawHref) {
        link.setAttribute("href", relativeHref);
      }

      if (relativeHref === "/kosher-posts") {
        link.setAttribute("href", "/center-city");
      }
    });

    normalizeMainNavSubmenus();

    if (normalizedPath === KOSHER_MAP_PATH) {
      applyKosherMapPageFallback();
      return;
    }

    if (neighborhoodEnabled) {
      ensureMapContainer(MAP_CONTAINER_ID, false);
    }
  }, [mapEnabled, neighborhoodEnabled, normalizedPath]);

  if (!mapEnabled) {
    return null;
  }

  return <Script src="https://elfsightcdn.com/platform.js" strategy="afterInteractive" />;
}
