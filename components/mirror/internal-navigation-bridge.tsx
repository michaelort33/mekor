"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void;
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

function resolveInternalNavigationTarget(anchor: HTMLAnchorElement) {
  const rawHref = anchor.getAttribute("href")?.trim();
  if (!rawHref) {
    return null;
  }

  if (rawHref.startsWith("#")) {
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

export function InternalNavigationBridge() {
  const router = useRouter();
  const prefetchedPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || hasModifierKey(event)) {
        return;
      }

      const anchor = getAnchorFromEventTarget(event.target);
      if (!anchor || !anchor.closest(".mirror-root")) {
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
      if (!anchor || !anchor.closest(".mirror-root")) {
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

    const handlePointerOver = (event: MouseEvent) => {
      prefetchForTarget(event.target);
    };

    const handleFocusIn = (event: FocusEvent) => {
      prefetchForTarget(event.target);
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("mouseover", handlePointerOver, true);
    document.addEventListener("focusin", handleFocusIn, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("mouseover", handlePointerOver, true);
      document.removeEventListener("focusin", handleFocusIn, true);
    };
  }, [router]);

  return null;
}
