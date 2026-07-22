"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Heart, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { QUICK_TILES, SUPPORT_MEKOR_LINK, type NavLink } from "@/lib/navigation/site-menu";
import { cn } from "@/lib/utils";

type UniversalSearchResult = {
  path: string;
  type: string;
  title: string;
  description: string;
  excerpt: string;
  keywords: string[];
  score: number;
};

const GROUP_ORDER = ["page", "event", "post", "news"] as const;

const GROUP_LABELS: Record<string, string> = {
  page: "Pages",
  event: "Events",
  post: "Posts",
  news: "News",
};

/**
 * Empty-state jump-to shortcuts (option 5a): the same six priorities as the
 * nav, sourced from site-menu so they stay in sync with it.
 */
const JUMP_TO: Array<NavLink & { accent?: boolean }> = [
  ...QUICK_TILES,
  { label: "Become a Member", href: "/membership", note: "Join the community" },
  {
    label: SUPPORT_MEKOR_LINK.label,
    href: SUPPORT_MEKOR_LINK.href,
    note: "Or sponsor a kiddush",
    accent: true,
  },
];

/** Curated suggestions — every term is verified to return hits in the search index. */
const POPULAR_SEARCHES = ["kiddush sponsorship", "shabbat times", "eruv", "kosher"];

const SECTION_LABEL_CLASS =
  "font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]";

type UniversalSearchProps = {
  compact?: boolean;
  /** Mount the dialog + shortcut listeners without rendering the trigger button. */
  hideTrigger?: boolean;
};

function getShortcutLabel() {
  if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent)) {
    return "⌘K";
  }
  return "Ctrl K";
}

export function openUniversalSearch() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("mekor:open-universal-search"));
}

function HighlightedTitle({ title, query }: { title: string; query: string }) {
  const q = query.trim();
  const index = q ? title.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (index === -1) {
    return <>{title}</>;
  }
  return (
    <>
      {title.slice(0, index)}
      <strong className="font-semibold">{title.slice(index, index + q.length)}</strong>
      {title.slice(index + q.length)}
    </>
  );
}

export function UniversalSearch({ compact = false, hideTrigger = false }: UniversalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const shortcutLabel = useMemo(() => getShortcutLabel(), []);

  const hasQuery = Boolean(query.trim());

  const resultGroups = useMemo(() => {
    if (!hasQuery) {
      return [];
    }
    const buckets = new Map<string, UniversalSearchResult[]>();
    for (const result of results) {
      const key = GROUP_LABELS[result.type] ? result.type : "page";
      const bucket = buckets.get(key) ?? [];
      bucket.push(result);
      buckets.set(key, bucket);
    }
    return GROUP_ORDER.filter((type) => buckets.has(type)).map((type) => ({
      label: GROUP_LABELS[type],
      items: buckets.get(type)!,
    }));
  }, [hasQuery, results]);

  const flatResults = useMemo(() => resultGroups.flatMap((group) => group.items), [resultGroups]);
  const optionCount = hasQuery ? flatResults.length : JUMP_TO.length;

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("mekor:open-universal-search", handleOpen);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mekor:open-universal-search", handleOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);

    if (!open || !query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const response = await fetch(`/api/search/universal?q=${encodeURIComponent(query)}&limit=10`, {
        signal: controller.signal,
      }).catch(() => null);

      if (controller.signal.aborted) {
        return;
      }

      if (!response || !response.ok) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        results?: UniversalSearchResult[];
      };
      setResults(payload.results ?? []);
      setIsSearching(false);
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  function navigateTo(path: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(path);
  }

  function openSelected() {
    if (hasQuery) {
      const selected = flatResults[selectedIndex];
      if (selected) {
        navigateTo(selected.path);
      } else if (!isSearching) {
        navigateTo(`/search?q=${encodeURIComponent(query)}`);
      }
      return;
    }
    const shortcut = JUMP_TO[selectedIndex];
    if (shortcut) {
      navigateTo(shortcut.href);
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (optionCount > 0) {
        setSelectedIndex((current) => (current + 1) % optionCount);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (optionCount > 0) {
        setSelectedIndex((current) => (current - 1 + optionCount) % optionCount);
      }
      return;
    }

    if (event.key === "Home" && optionCount > 0) {
      event.preventDefault();
      setSelectedIndex(0);
      return;
    }

    if (event.key === "End" && optionCount > 0) {
      event.preventDefault();
      setSelectedIndex(optionCount - 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      openSelected();
    }
  }

  function chooseSuggestion(term: string) {
    setQuery(term);
    inputRef.current?.focus();
  }

  const activeOptionId =
    optionCount > 0 ? `mekor-search-option-${Math.min(selectedIndex, optionCount - 1)}` : undefined;

  const popularChips = (
    <div className="flex flex-wrap gap-1.5">
      {POPULAR_SEARCHES.map((term) => (
        <button
          key={term}
          type="button"
          onClick={() => chooseSuggestion(term)}
          className="rounded-full border border-[var(--color-border)] bg-white/70 px-3 py-1 text-[13px] text-[var(--color-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          {term}
        </button>
      ))}
    </div>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
        <DialogPrimitive.Trigger asChild>
          <Button
            type="button"
            variant={compact ? "secondary" : "outline"}
            size={compact ? "icon" : "sm"}
            className={compact ? "" : "min-w-[9.5rem] justify-between bg-white/80"}
            aria-label="Search site"
          >
            {compact ? (
              <Search className="h-4 w-4" />
            ) : (
              <>
                <span className="inline-flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">{shortcutLabel}</span>
              </>
            )}
          </Button>
        </DialogPrimitive.Trigger>
      )}

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(16,24,32,0.52)] backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-150 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[10vh] z-50 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[#fffdf8] shadow-[0_40px_90px_-30px_rgba(10,16,26,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-200 data-[state=open]:ease-out motion-reduce:animate-none"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Search Mekor Habracha</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-4">
            <Search className="h-[18px] w-[18px] flex-none text-[var(--color-muted)]" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded="true"
              aria-controls="mekor-search-listbox"
              aria-activedescendant={activeOptionId}
              aria-label="Search Mekor"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search Mekor — pages, events, kosher spots…"
              className="h-9 w-full border-0 bg-transparent text-[16px] text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted)]"
            />
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close search"
                className="flex-none rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-muted)] transition hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                esc
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="max-h-[62vh] overflow-y-auto px-5 pb-4 pt-4">
            {!hasQuery ? (
              <>
                <div className={cn(SECTION_LABEL_CLASS, "mb-2")}>Jump to</div>
                <div
                  id="mekor-search-listbox"
                  role="listbox"
                  aria-label="Jump to a page"
                  className="grid grid-cols-1 gap-0.5 sm:grid-cols-2"
                >
                  {JUMP_TO.map((item, index) => {
                    const isArmed = index === selectedIndex;
                    return (
                      <Link
                        key={item.href}
                        id={`mekor-search-option-${index}`}
                        role="option"
                        aria-selected={isArmed}
                        href={item.href}
                        prefetch={false}
                        onClick={(event) => {
                          event.preventDefault();
                          navigateTo(item.href);
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "flex items-baseline gap-2 rounded-[10px] px-2.5 py-2 text-[15px] transition",
                          item.accent ? "font-semibold text-[#214e79]" : "text-[var(--color-foreground)]",
                          isArmed && "bg-[var(--color-surface-strong)]",
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {item.accent ? <Heart className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" /> : null}
                          {item.label}
                        </span>
                        {item.note ? <span className="truncate text-[12.5px] text-[var(--color-muted)]">{item.note}</span> : null}
                      </Link>
                    );
                  })}
                </div>

                <div className={cn(SECTION_LABEL_CLASS, "mb-2 mt-4")}>Popular</div>
                {popularChips}
              </>
            ) : null}

            {hasQuery && flatResults.length === 0 ? (
              <div aria-live="polite">
                <p className="px-1 py-1 text-[15px] text-[var(--color-foreground)]">
                  {isSearching ? "Searching…" : (
                    <>
                      No matches for <strong className="font-semibold">“{query.trim()}”</strong> — press ↵ to try the
                      full search page.
                    </>
                  )}
                </p>
                {!isSearching ? (
                  <>
                    <div className={cn(SECTION_LABEL_CLASS, "mb-2 mt-4")}>Popular</div>
                    {popularChips}
                  </>
                ) : null}
              </div>
            ) : null}

            {hasQuery && resultGroups.length > 0 ? (
              <div id="mekor-search-listbox" role="listbox" aria-label="Search results">
                {resultGroups.map((group, groupIndex) => {
                  const baseIndex = resultGroups
                    .slice(0, groupIndex)
                    .reduce((total, previous) => total + previous.items.length, 0);
                  return (
                    <div key={group.label} className={groupIndex > 0 ? "mt-3" : undefined}>
                      <div role="presentation" className={cn(SECTION_LABEL_CLASS, "mb-1.5")}>
                        {group.label}
                      </div>
                      <div className="grid gap-0.5">
                        {group.items.map((result, itemIndex) => {
                          const index = baseIndex + itemIndex;
                          const isArmed = index === selectedIndex;
                          const detail = result.excerpt || result.description;
                          return (
                            <button
                              key={result.path}
                              id={`mekor-search-option-${index}`}
                              role="option"
                              aria-selected={isArmed}
                              type="button"
                              onMouseEnter={() => setSelectedIndex(index)}
                              onClick={() => navigateTo(result.path)}
                              className={cn(
                                "grid w-full gap-0.5 rounded-[10px] px-2.5 py-2 text-left transition",
                                isArmed && "bg-[var(--color-surface-strong)]",
                              )}
                            >
                              <span className="flex items-center justify-between gap-3">
                                <span className="truncate text-[15px] text-[var(--color-foreground)]">
                                  <HighlightedTitle title={result.title} query={query} />
                                </span>
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "flex-none rounded-[5px] border border-[var(--color-border)] px-1.5 font-mono text-[10.5px] text-[var(--color-muted)] transition-opacity",
                                    isArmed ? "opacity-100" : "opacity-0",
                                  )}
                                >
                                  ↵
                                </span>
                              </span>
                              <span className="truncate text-[12.5px] text-[var(--color-muted)]">
                                {detail ? `${detail} · ` : ""}
                                {result.path}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] bg-[var(--color-surface-strong)] px-5 py-2.5 font-mono text-[11px] text-[var(--color-muted)]">
            <span aria-hidden="true" className="hidden sm:inline">
              ↑↓ move · ↵ open · esc close
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              {hasQuery ? (
                <span aria-live="polite">
                  {isSearching
                    ? "Searching…"
                    : `${flatResults.length} result${flatResults.length === 1 ? "" : "s"} ·`}
                </span>
              ) : null}
              <Link
                href={hasQuery ? `/search?q=${encodeURIComponent(query)}` : "/search"}
                onClick={() => setOpen(false)}
                className="rounded-sm underline-offset-2 transition hover:text-[var(--color-foreground)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                Full search page →
              </Link>
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
