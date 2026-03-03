"use client";

import { KOSHER_SET_FILTER_EVENT, type KosherSetFilterDetail } from "@/components/kosher/kosher-filter-events";

type KosherPlacesHighlight = {
  label: string;
  tag?: string;
};

type KosherHighlightFiltersProps = {
  currentPath: string;
  highlights: KosherPlacesHighlight[];
};

function updateUrlForTag(currentPath: string, tag: string) {
  const url = new URL(window.location.href);
  url.pathname = currentPath;

  if (!tag || tag === "all") {
    url.searchParams.delete("tag");
  } else {
    url.searchParams.set("tag", tag);
  }

  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}#kosher-directory`);
}

function emitFilterUpdate(detail: KosherSetFilterDetail) {
  window.dispatchEvent(new CustomEvent<KosherSetFilterDetail>(KOSHER_SET_FILTER_EVENT, { detail }));
}

export function KosherHighlightFilters({ currentPath, highlights }: KosherHighlightFiltersProps) {
  return (
    <ul className="kosher-places__highlights" aria-label="Dining highlights">
      {highlights.map((highlight) => (
        <li key={`${highlight.label}|${highlight.tag ?? "none"}`}>
          {highlight.tag ? (
            <button
              type="button"
              className="kosher-places__highlight-button"
              onClick={() => {
                updateUrlForTag(currentPath, highlight.tag ?? "all");
                emitFilterUpdate({ tag: highlight.tag });
                document.getElementById("kosher-directory")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              {highlight.label}
            </button>
          ) : (
            <span>{highlight.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
