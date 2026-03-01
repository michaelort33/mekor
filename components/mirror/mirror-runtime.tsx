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
  styleBundleHref?: string | null;
  stylePrefetchHints?: Record<string, string>;
};

type PodcastEpisode = {
  id: string;
  title: string;
  description: string | null;
  episodeUrl: string | null;
  audioUrl: string | null;
  duration: string | null;
  publishedAt: string | null;
};

const VOLUNTEER_OPPORTUNITY_OPTIONS = [
  "Torah and Haftorah Reading",
  "Meal Train and Shabbat Hospitality",
  "Eruv Checking and Mashgichim",
  "Volunteer Mashgiach",
  "General Volunteer Opportunity",
];

function formatPodcastDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

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

function preloadStylesheet(href: string) {
  let resolvedHref: string;
  try {
    resolvedHref = new URL(href, window.location.href).href;
  } catch {
    return;
  }

  const existing = Array.from(
    document.querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"][href], link[rel="preload"][as="style"][href]',
    ),
  );

  if (existing.some((link) => link.href === resolvedHref)) {
    return;
  }

  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "style";
  preload.href = resolvedHref;
  document.head.appendChild(preload);
}

export function MirrorRuntime({
  rootId,
  path,
  styleBundleHref = null,
  stylePrefetchHints = {},
}: Props) {
  const router = useRouter();
  const prefetchedPathsRef = useRef<Set<string>>(new Set());
  const prefetchedStyleHrefsRef = useRef<Set<string>>(new Set());
  const loadMapScript = shouldLoadKosherMapScript(path);

  useEffect(() => {
    if (!styleBundleHref) {
      return;
    }

    const existing = document.querySelector<HTMLLinkElement>(
      `head link[rel="stylesheet"][data-mirror-pinned-style="${styleBundleHref}"]`,
    );
    if (existing) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = styleBundleHref;
    link.dataset.mirrorPinnedStyle = styleBundleHref;
    document.head.appendChild(link);
  }, [styleBundleHref]);

  useEffect(() => {
    const root = document.getElementById(rootId);
    const mirrorRoot = root?.closest<HTMLElement>(".mirror-root");
    if (!root || !mirrorRoot) {
      return;
    }

    mirrorRoot.dataset.stylesReady = "false";
    mirrorRoot.dataset.styleTimeout = "false";

    if (!styleBundleHref) {
      mirrorRoot.dataset.stylesReady = "true";
      return;
    }

    let expectedHref: string;
    try {
      expectedHref = new URL(styleBundleHref, window.location.href).href;
    } catch {
      mirrorRoot.dataset.stylesReady = "true";
      return;
    }

    let isDone = false;
    const cleanupListeners: Array<() => void> = [];
    const timeoutId = window.setTimeout(() => {
      if (!isDone) {
        mirrorRoot.dataset.styleTimeout = "true";
      }
    }, 2500);

    const markReady = () => {
      if (isDone) {
        return;
      }
      isDone = true;
      mirrorRoot.dataset.stylesReady = "true";
      mirrorRoot.dataset.styleTimeout = "false";
      window.clearTimeout(timeoutId);
      cleanupListeners.forEach((cleanup) => {
        cleanup();
      });
    };

    const getExpectedStylesheetLink = () => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'),
      );

      return candidates.find((link) => link.href === expectedHref) ?? null;
    };

    const wireStylesheetLink = (link: HTMLLinkElement) => {
      if (isDone) {
        return;
      }

      if (link.sheet) {
        markReady();
        return;
      }

      const handleLoad = () => {
        markReady();
      };
      const handleError = () => {
        mirrorRoot.dataset.styleTimeout = "true";
      };

      link.addEventListener("load", handleLoad, { once: true });
      link.addEventListener("error", handleError, { once: true });

      cleanupListeners.push(() => {
        link.removeEventListener("load", handleLoad);
        link.removeEventListener("error", handleError);
      });
    };

    const initialLink = getExpectedStylesheetLink();
    if (initialLink) {
      wireStylesheetLink(initialLink);
    } else {
      const observer = new MutationObserver(() => {
        const discoveredLink = getExpectedStylesheetLink();
        if (!discoveredLink) {
          return;
        }

        observer.disconnect();
        wireStylesheetLink(discoveredLink);
      });

      observer.observe(document.head, { childList: true, subtree: true });
      cleanupListeners.push(() => {
        observer.disconnect();
      });
    }

    return () => {
      window.clearTimeout(timeoutId);
      cleanupListeners.forEach((cleanup) => {
        cleanup();
      });
    };
  }, [rootId, styleBundleHref]);

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

      const styleHref = stylePrefetchHints[url.pathname];
      if (styleHref && !prefetchedStyleHrefsRef.current.has(styleHref)) {
        prefetchedStyleHrefsRef.current.add(styleHref);
        preloadStylesheet(styleHref);
      }
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
  }, [rootId, router, stylePrefetchHints]);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) {
      return;
    }

    let frameId = 0;

    const setImportant = (element: HTMLElement, property: string, value: string) => {
      element.style.setProperty(property, value, "important");
    };

    const normalizeMobileOverflow = () => {
      if (window.innerWidth > 1024) {
        return;
      }

      const viewportWidth = window.innerWidth;

      const mainContainers = root.querySelectorAll<HTMLElement>(
        '#SITE_CONTAINER, #site-root, #masterPage, #PAGES_CONTAINER, #SITE_PAGES',
      );
      mainContainers.forEach((container) => {
        setImportant(container, "width", "100%");
        setImportant(container, "max-width", "100%");
        setImportant(container, "min-width", "0");
      });

      const gridContainers = root.querySelectorAll<HTMLElement>(
        '[data-mesh-id$="inlineContent-gridContainer"], [data-mesh-id$="centeredContent-gridContainer"]',
      );
      gridContainers.forEach((container) => {
        const computed = window.getComputedStyle(container);
        if (computed.display === "none" || computed.visibility === "hidden") {
          return;
        }

        const rect = container.getBoundingClientRect();
        if (rect.width <= viewportWidth + 8 && rect.left >= -8 && rect.right <= viewportWidth + 8) {
          return;
        }

        setImportant(container, "width", "100%");
        setImportant(container, "max-width", "100%");
        setImportant(container, "min-width", "0");
        setImportant(container, "left", "0px");
        setImportant(container, "right", "auto");
        setImportant(container, "margin-left", "0px");
        setImportant(container, "margin-right", "0px");
      });

      const overflowCandidates = root.querySelectorAll<HTMLElement>(
        '[data-mesh-id$="inlineContent-gridContainer"] > *, [data-mesh-id$="centeredContent-gridContainer"] > *',
      );

      overflowCandidates.forEach((candidate) => {
        const computed = window.getComputedStyle(candidate);
        if (computed.display === "none" || computed.visibility === "hidden") {
          return;
        }

        const rect = candidate.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          return;
        }

        if (rect.right > viewportWidth + 8 || rect.left < -8) {
          setImportant(candidate, "position", "relative");
          setImportant(candidate, "inset", "auto");
          setImportant(candidate, "left", "0px");
          setImportant(candidate, "right", "auto");
          setImportant(candidate, "top", "auto");
          setImportant(candidate, "margin-left", "0px");
          setImportant(candidate, "margin-right", "0px");
          setImportant(candidate, "width", "100%");
          setImportant(candidate, "max-width", "100%");
          setImportant(candidate, "min-width", "0");
        }
      });

      const overflowText = root.querySelectorAll<HTMLElement>(".wixui-rich-text__text");
      overflowText.forEach((textNode) => {
        const computed = window.getComputedStyle(textNode);
        if (computed.display === "none" || computed.visibility === "hidden") {
          return;
        }

        const rect = textNode.getBoundingClientRect();
        if (rect.width <= viewportWidth + 8 && rect.left >= -8 && rect.right <= viewportWidth + 8) {
          return;
        }

        setImportant(textNode, "max-width", "100%");
        setImportant(textNode, "width", "auto");
        setImportant(textNode, "white-space", "normal");
        setImportant(textNode, "overflow-wrap", "break-word");
      });

      const narrowRichTextBlocks = root.querySelectorAll<HTMLElement>(".wixui-rich-text");
      narrowRichTextBlocks.forEach((block) => {
        const computed = window.getComputedStyle(block);
        if (computed.display === "none" || computed.visibility === "hidden") {
          return;
        }

        const textLength = (block.textContent || "").replace(/\s+/g, " ").trim().length;
        if (textLength < 80) {
          return;
        }

        const rect = block.getBoundingClientRect();
        if (rect.width >= viewportWidth * 0.72) {
          return;
        }

        setImportant(block, "width", "100%");
        setImportant(block, "max-width", "100%");
        setImportant(block, "min-width", "0");
        setImportant(block, "left", "0px");
        setImportant(block, "right", "auto");
        setImportant(block, "margin-left", "0px");
        setImportant(block, "margin-right", "0px");
      });

      const narrowColumns = root.querySelectorAll<HTMLElement>(".wixui-column-strip__column");
      narrowColumns.forEach((column) => {
        const computed = window.getComputedStyle(column);
        if (computed.display === "none" || computed.visibility === "hidden") {
          return;
        }

        const textLength = (column.textContent || "").replace(/\s+/g, " ").trim().length;
        if (textLength < 120) {
          return;
        }

        const rect = column.getBoundingClientRect();
        if (rect.width >= viewportWidth * 0.72) {
          return;
        }

        setImportant(column, "width", "100%");
        setImportant(column, "max-width", "100%");
        setImportant(column, "min-width", "0");
        setImportant(column, "left", "0px");
        setImportant(column, "right", "auto");
        setImportant(column, "margin-left", "0px");
        setImportant(column, "margin-right", "0px");
      });
    };

    const scheduleNormalize = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(normalizeMobileOverflow);
    };

    scheduleNormalize();
    const settleTimeoutId = window.setTimeout(scheduleNormalize, 900);
    window.addEventListener("resize", scheduleNormalize);

    return () => {
      window.clearTimeout(settleTimeoutId);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleNormalize);
    };
  }, [rootId, path]);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) {
      return;
    }

    let frameId = 0;
    let timeoutId = 0;

    const unlockPausedMotionEntries = () => {
      const candidates = root.querySelectorAll<HTMLElement>("[data-motion-enter]");

      candidates.forEach((element) => {
        const computed = window.getComputedStyle(element);
        if (computed.display === "none" || computed.visibility === "hidden") {
          return;
        }

        const rect = element.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) {
          return;
        }

        const animationNames = computed.animationName
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        const playStates = computed.animationPlayState
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);

        const hasPausedMotionAnimation = animationNames.some(
          (name, index) =>
            name !== "none" &&
            name.includes("motion-") &&
            (playStates[index] ?? playStates[0] ?? "running") === "paused",
        );

        if (!hasPausedMotionAnimation || Number(computed.opacity || "1") > 0.05) {
          return;
        }

        element.setAttribute("data-motion-enter", "done");
        element.style.setProperty("animation", "none", "important");
        element.style.setProperty("opacity", "1", "important");
      });
    };

    const scheduleUnlock = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(unlockPausedMotionEntries);
    };

    scheduleUnlock();
    timeoutId = window.setTimeout(scheduleUnlock, 1200);
    window.addEventListener("resize", scheduleUnlock);

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleUnlock);
    };
  }, [rootId, path]);

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

  useEffect(() => {
    if (path !== "/team-4") {
      return;
    }

    const root = document.getElementById(rootId);
    if (!root) {
      return;
    }

    const form = root.querySelector<HTMLFormElement>('form[data-mekor-form="volunteer"]');
    if (!form) {
      return;
    }

    const firstNameInput = form.querySelector<HTMLInputElement>('input[name="firstName"]');
    const lastNameInput = form.querySelector<HTMLInputElement>('input[name="lastName"]');
    const emailInput = form.querySelector<HTMLInputElement>('input[name="email"]');
    const phoneInput = form.querySelector<HTMLInputElement>('input[name="phone"]');
    const dateInput = form.querySelector<HTMLInputElement>('input[name="availabilityDate"]');
    const opportunitySelect = form.querySelector<HTMLSelectElement>('select[name="opportunity"]');
    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const successMessage = form.querySelector<HTMLElement>('[data-mekor-form-success="true"]');
    const datePickerButton = form.querySelector<HTMLButtonElement>(".wixui-date-picker button");

    const setImportant = (element: HTMLElement, property: string, value: string) => {
      element.style.setProperty(property, value, "important");
    };

    const normalizeVolunteerLayout = () => {
      if (window.innerWidth > 1024) {
        return;
      }

      document.documentElement.style.setProperty("overflow-x", "clip", "important");
      document.body.style.setProperty("overflow-x", "clip", "important");

      const gridContainers = root.querySelectorAll<HTMLElement>(
        '#comp-m5y7k135 [data-mesh-id$="inlineContent-gridContainer"], #comp-m5ygx1se [data-mesh-id$="inlineContent-gridContainer"], #comp-m5yh3yib [data-mesh-id$="inlineContent-gridContainer"], #comp-m61av521 [data-mesh-id$="inlineContent-gridContainer"]',
      );

      gridContainers.forEach((container) => {
        setImportant(container, "display", "grid");
        setImportant(container, "grid-template-columns", "minmax(0,1fr)");
        setImportant(container, "row-gap", "12px");
        setImportant(container, "column-gap", "0");
        setImportant(container, "padding-left", "16px");
        setImportant(container, "padding-right", "16px");
        setImportant(container, "width", "100%");
        setImportant(container, "max-width", "100%");
        setImportant(container, "min-width", "0");
        setImportant(container, "left", "0px");
        setImportant(container, "right", "auto");
        setImportant(container, "margin", "0");
      });

      const stackedBlocks = root.querySelectorAll<HTMLElement>(
        "#comp-m5y7k13t, #comp-m5ygnksh, #comp-m5yh3yjy, #comp-m5yh3ykf, #comp-m5y7k140__item1, #comp-m5ygnkuh2__item1, #comp-m5yh3yk2__item1, #comp-m5yh3ykh2__item1, #comp-m5ygx1su, #comp-m61av52b, #comp-m61av52i, #comp-m5y86lvs, #comp-m5y86lvw",
      );

      stackedBlocks.forEach((block) => {
        setImportant(block, "position", "relative");
        setImportant(block, "inset", "auto");
        setImportant(block, "left", "0px");
        setImportant(block, "right", "auto");
        setImportant(block, "top", "auto");
        setImportant(block, "margin", "0");
        setImportant(block, "width", "100%");
        setImportant(block, "max-width", "100%");
        setImportant(block, "min-width", "0");
        setImportant(block, "height", "auto");
        setImportant(block, "min-height", "0");
        setImportant(block, "grid-area", "auto");
        setImportant(block, "grid-column", "1");
        setImportant(block, "grid-row", "auto");
        setImportant(block, "transform", "none");
      });

      const repeaterWrappers = root.querySelectorAll<HTMLElement>(
        "#comp-m5y7k13t .Exmq9, #comp-m5y7k13t .TmK0x, #comp-m5y7k13t ._FiCX, #comp-m5ygnksh .Exmq9, #comp-m5ygnksh .TmK0x, #comp-m5ygnksh ._FiCX, #comp-m5yh3yjy .Exmq9, #comp-m5yh3yjy .TmK0x, #comp-m5yh3yjy ._FiCX, #comp-m5yh3ykf .Exmq9, #comp-m5yh3ykf .TmK0x, #comp-m5yh3ykf ._FiCX",
      );

      repeaterWrappers.forEach((wrapper) => {
        setImportant(wrapper, "display", "block");
        setImportant(wrapper, "width", "100%");
        setImportant(wrapper, "max-width", "100%");
        setImportant(wrapper, "min-width", "0");
        setImportant(wrapper, "left", "0px");
        setImportant(wrapper, "right", "auto");
        setImportant(wrapper, "margin", "0");
        setImportant(wrapper, "transform", "none");
      });
    };

    let frameId = 0;
    const scheduleVolunteerLayoutNormalize = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(normalizeVolunteerLayout);
    };

    scheduleVolunteerLayoutNormalize();
    window.addEventListener("resize", scheduleVolunteerLayoutNormalize);

    const layoutObserver = new MutationObserver(() => {
      scheduleVolunteerLayoutNormalize();
    });
    layoutObserver.observe(root, { childList: true, subtree: true });

    if (dateInput) {
      dateInput.removeAttribute("readonly");
      dateInput.type = "date";
      dateInput.removeAttribute("inputmode");
      dateInput.classList.add("mekor-native-date-input");
    }

    if (opportunitySelect && opportunitySelect.options.length <= 1) {
      const fragment = document.createDocumentFragment();

      for (const label of VOLUNTEER_OPPORTUNITY_OPTIONS) {
        const option = document.createElement("option");
        option.value = label;
        option.textContent = label;
        fragment.appendChild(option);
      }

      opportunitySelect.appendChild(fragment);
    }

    const handleDateButtonClick = (event: MouseEvent) => {
      if (!dateInput) {
        return;
      }

      event.preventDefault();
      dateInput.focus();
      const dateInputWithPicker = dateInput as HTMLInputElement & {
        showPicker?: () => void;
      };
      dateInputWithPicker.showPicker?.();
    };

    if (datePickerButton) {
      datePickerButton.addEventListener("click", handleDateButtonClick);
    }

    const setSubmittingState = (submitting: boolean) => {
      if (!submitButton) {
        return;
      }

      submitButton.disabled = submitting;
      submitButton.setAttribute("aria-disabled", submitting ? "true" : "false");
    };

    const handleSubmit = async (event: Event) => {
      event.preventDefault();

      if (
        !firstNameInput ||
        !lastNameInput ||
        !emailInput ||
        !opportunitySelect ||
        !form.reportValidity()
      ) {
        return;
      }

      const firstName = firstNameInput.value.trim();
      const lastName = lastNameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput?.value.trim() ?? "";
      const opportunity = opportunitySelect.value.trim();
      const availabilityDate = dateInput?.value.trim() ?? "";

      if (!firstName || !lastName || !email || !opportunity) {
        return;
      }

      const payload = {
        name: `${firstName} ${lastName}`.trim(),
        email,
        phone,
        message: [
          `Opportunity: ${opportunity}`,
          availabilityDate ? `Availability Date: ${availabilityDate}` : "Availability Date: N/A",
          `First Name: ${firstName}`,
          `Last Name: ${lastName}`,
        ].join("\n"),
        sourcePath: window.location.pathname,
        firstName,
        lastName,
        opportunity,
        availabilityDate,
      };

      setSubmittingState(true);

      try {
        const response = await fetch("/api/forms/volunteer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          return;
        }

        form.reset();
        if (successMessage) {
          successMessage.hidden = false;
        }
      } finally {
        setSubmittingState(false);
      }
    };

    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("submit", handleSubmit);
      if (datePickerButton) {
        datePickerButton.removeEventListener("click", handleDateButtonClick);
      }
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleVolunteerLayoutNormalize);
      layoutObserver.disconnect();
    };
  }, [path, rootId]);

  useEffect(() => {
    if (path !== "/from-the-rabbi-s-desk") {
      return;
    }

    const root = document.getElementById(rootId);
    if (!root) {
      return;
    }

    const podcastSection = root.querySelector<HTMLElement>("#TPASection_k0arg66a");
    if (!podcastSection) {
      return;
    }

    podcastSection.style.setProperty("height", "auto", "important");
    podcastSection.style.setProperty("overflow", "visible", "important");

    const mount = document.createElement("section");
    mount.className = "mirror-podcast-fallback";
    podcastSection.replaceChildren(mount);

    const searchInput = document.createElement("input");
    searchInput.className = "mirror-podcast-search";
    searchInput.type = "search";
    searchInput.placeholder = "Search podcast...";
    searchInput.setAttribute("aria-label", "Search podcast episodes");

    const list = document.createElement("div");
    list.className = "mirror-podcast-list";

    const loadMoreButton = document.createElement("button");
    loadMoreButton.className = "mirror-podcast-load-more";
    loadMoreButton.type = "button";
    loadMoreButton.textContent = "Load More";

    mount.append(searchInput, list, loadMoreButton);

    let episodes: PodcastEpisode[] = [];
    let searchTerm = "";
    let visibleCount = 5;
    const pageSize = 5;
    let isDisposed = false;

    const render = () => {
      if (isDisposed) {
        return;
      }

      const normalizedSearch = searchTerm.trim().toLowerCase();
      const filteredEpisodes =
        normalizedSearch.length === 0
          ? episodes
          : episodes.filter((episode) => {
              const title = episode.title.toLowerCase();
              const description = (episode.description ?? "").toLowerCase();
              return title.includes(normalizedSearch) || description.includes(normalizedSearch);
            });

      list.replaceChildren();
      const visibleEpisodes = filteredEpisodes.slice(0, visibleCount);

      visibleEpisodes.forEach((episode) => {
        const row = document.createElement("article");
        row.className = "mirror-podcast-episode";

        const header = document.createElement("div");
        header.className = "mirror-podcast-episode-header";

        const title = document.createElement("h3");
        title.className = "mirror-podcast-episode-title";
        title.textContent = episode.title;

        const meta = document.createElement("p");
        meta.className = "mirror-podcast-episode-meta";
        const dateText = formatPodcastDate(episode.publishedAt);
        meta.textContent = [dateText, episode.duration].filter(Boolean).join(" | ");

        header.append(title, meta);
        row.append(header);

        if (episode.description) {
          const description = document.createElement("p");
          description.className = "mirror-podcast-episode-description";
          description.textContent = episode.description;
          row.append(description);
        }

        const actions = document.createElement("div");
        actions.className = "mirror-podcast-episode-actions";

        if (episode.audioUrl) {
          const audio = document.createElement("audio");
          audio.className = "mirror-podcast-audio";
          audio.controls = true;
          audio.preload = "none";
          audio.src = episode.audioUrl;
          actions.append(audio);
        }

        if (episode.episodeUrl) {
          const openEpisode = document.createElement("a");
          openEpisode.className = "mirror-podcast-open";
          openEpisode.href = episode.episodeUrl;
          openEpisode.target = "_blank";
          openEpisode.rel = "noreferrer noopener";
          openEpisode.textContent = "Open Episode";
          actions.append(openEpisode);
        }

        row.append(actions);
        list.append(row);
      });

      if (visibleEpisodes.length === 0) {
        const empty = document.createElement("p");
        empty.className = "mirror-podcast-empty";
        empty.textContent = "No podcast episodes matched your search.";
        list.append(empty);
      }

      loadMoreButton.hidden = visibleCount >= filteredEpisodes.length;
    };

    const showUnavailableMessage = () => {
      if (isDisposed) {
        return;
      }

      list.replaceChildren();
      const error = document.createElement("p");
      error.className = "mirror-podcast-empty";
      error.textContent = "Podcasts are temporarily unavailable.";

      const openSource = document.createElement("a");
      openSource.className = "mirror-podcast-open";
      openSource.href = "https://www.mekorhabracha.org/from-the-rabbi-s-desk";
      openSource.target = "_blank";
      openSource.rel = "noreferrer noopener";
      openSource.textContent = "Open on mekorhabracha.org";

      list.append(error, openSource);
      loadMoreButton.hidden = true;
    };

    const loading = document.createElement("p");
    loading.className = "mirror-podcast-empty";
    loading.textContent = "Loading podcast episodes...";
    list.append(loading);
    loadMoreButton.hidden = true;

    const request = fetch("/api/podcast-episodes?limit=60", { cache: "no-store" });
    request
      .then((response) => {
        if (!response.ok) {
          throw new Error("podcast-feed-unavailable");
        }
        return response.json() as Promise<{ episodes: PodcastEpisode[] }>;
      })
      .then((payload) => {
        episodes = payload.episodes;
        render();
      })
      .catch(() => {
        showUnavailableMessage();
      });

    const handleSearch = () => {
      searchTerm = searchInput.value;
      visibleCount = pageSize;
      render();
    };

    const handleLoadMore = () => {
      visibleCount += pageSize;
      render();
    };

    searchInput.addEventListener("input", handleSearch);
    loadMoreButton.addEventListener("click", handleLoadMore);

    return () => {
      isDisposed = true;
      searchInput.removeEventListener("input", handleSearch);
      loadMoreButton.removeEventListener("click", handleLoadMore);
    };
  }, [path, rootId]);

  if (!loadMapScript) {
    return null;
  }

  return <Script src="https://elfsightcdn.com/platform.js" strategy="afterInteractive" />;
}
