"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { shouldLoadKosherMapScript } from "@/lib/mirror/kosher-map";

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void;
};

type Props = {
  rootId: string;
  path: string;
};

function hasModifierKey(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function getAnchorFromEventTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  const anchor = target.closest("a[href]");
  return anchor instanceof HTMLAnchorElement ? anchor : null;
}

function isHashOnlyChange(url: URL) {
  const current = window.location;
  return `${url.pathname}${url.search}` === `${current.pathname}${current.search}` && Boolean(url.hash);
}

function resolveSamePageAnchorScrollTarget(anchor: HTMLAnchorElement) {
  const dataAnchor = anchor.getAttribute("data-anchor")?.trim();
  if (!dataAnchor) {
    return null;
  }

  const href = anchor.getAttribute("href")?.trim();
  if (!href) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const targetPath = `${url.pathname}${url.search}`;
  if (currentPath !== targetPath || url.hash) {
    return null;
  }

  const explicitTarget = document.getElementById(dataAnchor);
  if (explicitTarget instanceof HTMLElement) {
    return explicitTarget;
  }

  const currentSection = anchor.closest("section");
  const nextSection = currentSection?.nextElementSibling;
  if (nextSection instanceof HTMLElement) {
    return nextSection;
  }

  return null;
}

function resolveInternalNavigationTarget(anchor: HTMLAnchorElement) {
  const rawHref = anchor.getAttribute("href")?.trim();
  if (!rawHref || rawHref.startsWith("#")) {
    return null;
  }

  if (
    rawHref.startsWith("mailto:") ||
    rawHref.startsWith("tel:") ||
    rawHref.startsWith("javascript:")
  ) {
    return null;
  }

  if (anchor.hasAttribute("download")) {
    return null;
  }

  const target = (anchor.getAttribute("target") ?? "").toLowerCase();
  if (target && target !== "_self") {
    return null;
  }

  const rel = (anchor.getAttribute("rel") ?? "").toLowerCase();
  if (rel.split(/\s+/).includes("external")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(rawHref, window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) {
    return null;
  }

  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api/")) {
    return null;
  }

  return url;
}

function closeAllSubmenus(navRoot: HTMLElement) {
  navRoot.querySelectorAll<HTMLLIElement>("li.mirror-native-has-submenu").forEach((item) => {
    item.dataset.open = "false";

    const trigger = item.querySelector<HTMLElement>(":scope > .mirror-native-submenu-trigger");
    const toggle = item.querySelector<HTMLButtonElement>(
      ":scope > .mirror-native-submenu-toggle, :scope > button._pfxlW",
    );

    trigger?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-expanded", "false");
  });
}

function setSubmenuOpen(item: HTMLLIElement, open: boolean) {
  item.dataset.open = open ? "true" : "false";

  const trigger = item.querySelector<HTMLElement>(":scope > .mirror-native-submenu-trigger");
  const toggle = item.querySelector<HTMLButtonElement>(
    ":scope > .mirror-native-submenu-toggle, :scope > button._pfxlW",
  );

  trigger?.setAttribute("aria-expanded", open ? "true" : "false");
  toggle?.setAttribute("aria-expanded", open ? "true" : "false");
}

export function MirrorRuntime({ rootId, path }: Props) {
  const router = useRouter();
  const prefetchedPathsRef = useRef<Set<string>>(new Set());
  const loadMapScript = shouldLoadKosherMapScript(path);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || hasModifierKey(event)) {
        return;
      }

      const anchor = getAnchorFromEventTarget(event.target);
      if (!anchor || !root.contains(anchor)) {
        return;
      }

      const samePageAnchorTarget = resolveSamePageAnchorScrollTarget(anchor);
      if (samePageAnchorTarget) {
        event.preventDefault();
        samePageAnchorTarget.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const url = resolveInternalNavigationTarget(anchor);
      if (!url || isHashOnlyChange(url)) {
        return;
      }

      event.preventDefault();
      const href = `${url.pathname}${url.search}${url.hash}`;

      const navigate = () => {
        router.push(href, { scroll: !url.hash });
      };

      const transitionDocument = document as TransitionDocument;
      if (typeof transitionDocument.startViewTransition === "function") {
        transitionDocument.startViewTransition(() => {
          navigate();
        });
        return;
      }

      navigate();
    };

    const prefetchForTarget = (target: EventTarget | null) => {
      const anchor = getAnchorFromEventTarget(target);
      if (!anchor || !root.contains(anchor)) {
        return;
      }

      const url = resolveInternalNavigationTarget(anchor);
      if (!url || isHashOnlyChange(url)) {
        return;
      }

      const href = `${url.pathname}${url.search}`;
      if (prefetchedPathsRef.current.has(href)) {
        return;
      }

      prefetchedPathsRef.current.add(href);
      router.prefetch(href);
    };

    const handlePointerOver = (event: PointerEvent) => {
      prefetchForTarget(event.target);
    };

    const handleFocusIn = (event: FocusEvent) => {
      prefetchForTarget(event.target);
    };

    root.addEventListener("click", handleClick, true);
    root.addEventListener("pointerover", handlePointerOver, true);
    root.addEventListener("focusin", handleFocusIn, true);

    return () => {
      root.removeEventListener("click", handleClick, true);
      root.removeEventListener("pointerover", handlePointerOver, true);
      root.removeEventListener("focusin", handleFocusIn, true);
    };
  }, [rootId, router]);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) {
      return;
    }

    const cleanups: Array<() => void> = [];
    const addListener = <K extends keyof HTMLElementEventMap>(
      element: HTMLElement,
      type: K,
      listener: (event: HTMLElementEventMap[K]) => void,
    ) => {
      const typed = listener as EventListener;
      element.addEventListener(type, typed);
      cleanups.push(() => {
        element.removeEventListener(type, typed);
      });
    };

    const navRoots = root.querySelectorAll<HTMLElement>('nav[aria-label="Site"]');

    navRoots.forEach((navRoot) => {
      const menuItems = navRoot.querySelectorAll<HTMLLIElement>("li.mirror-native-has-submenu");

      menuItems.forEach((item) => {
        item.dataset.open = "false";

        const trigger = item.querySelector<HTMLElement>(":scope > .mirror-native-submenu-trigger");
        const toggle = item.querySelector<HTMLButtonElement>(
          ":scope > .mirror-native-submenu-toggle, :scope > button._pfxlW",
        );

        if (!trigger || !toggle) {
          return;
        }

        const toggleOpen = () => {
          const isOpen = item.dataset.open === "true";
          closeAllSubmenus(navRoot);
          setSubmenuOpen(item, !isOpen);
        };

        addListener(trigger, "click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleOpen();
        });

        addListener(trigger, "keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleOpen();
          }

          if (event.key === "Escape") {
            closeAllSubmenus(navRoot);
          }
        });

        addListener(toggle, "click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleOpen();
        });

        addListener(item, "mouseenter", () => {
          setSubmenuOpen(item, true);
        });

        addListener(item, "mouseleave", () => {
          setSubmenuOpen(item, false);
        });

        addListener(item, "focusout", (event) => {
          const nextTarget = event.relatedTarget;
          if (!(nextTarget instanceof Node) || !item.contains(nextTarget)) {
            setSubmenuOpen(item, false);
          }
        });
      });

      const handleDocumentClick = (event: MouseEvent) => {
        if (!navRoot.contains(event.target as Node)) {
          closeAllSubmenus(navRoot);
        }
      };

      document.addEventListener("click", handleDocumentClick, true);
      cleanups.push(() => {
        document.removeEventListener("click", handleDocumentClick, true);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [rootId]);

  if (!loadMapScript) {
    return null;
  }

  return <Script src="https://elfsightcdn.com/platform.js" strategy="afterInteractive" />;
}
