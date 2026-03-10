"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UniversalSearchResult = {
  path: string;
  type: string;
  title: string;
  description: string;
  excerpt: string;
  keywords: string[];
  score: number;
};

const TYPE_LABELS: Record<string, string> = {
  page: "Page",
  event: "Event",
  post: "Post",
  news: "News",
};

type UniversalSearchProps = {
  compact?: boolean;
};

function getShortcutLabel() {
  if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)) {
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

export function UniversalSearch({ compact = false }: UniversalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const shortcutLabel = useMemo(() => getShortcutLabel(), []);
  const visibleResults = query.trim() ? results : [];

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
    if (!open) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (!query.trim()) {
        return;
      }

      const response = await fetch(`/api/search/universal?q=${encodeURIComponent(query)}&limit=10`, {
        signal: controller.signal,
      }).catch(() => null);

      if (!response || !response.ok) {
        setResults([]);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        results?: UniversalSearchResult[];
      };
      setResults(payload.results ?? []);
      setSelectedIndex(0);
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

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(current + 1, Math.max(visibleResults.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && visibleResults[selectedIndex]) {
      event.preventDefault();
      navigateTo(visibleResults[selectedIndex]!.path);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
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

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(16,24,32,0.52)] backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[12vh] z-50 w-[min(720px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(180deg,#fffdf8_0%,#f7f2e8_100%)] shadow-[0_32px_90px_-34px_rgba(15,23,42,0.52)]">
          <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-[var(--color-muted)]" />
              <Input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search page names, URLs, and content"
                className="h-12 border-0 bg-transparent px-0 shadow-none focus:ring-0"
              />
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/82 text-[var(--color-muted)]"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="max-h-[62vh] overflow-y-auto px-3 py-3 sm:px-4">
            {!query.trim() ? (
              <div className="rounded-[22px] border border-dashed border-[var(--color-border)] bg-white/65 px-5 py-6 text-sm leading-7 text-[var(--color-muted)]">
                Start typing to search across page names, URLs, metadata, and indexed page content.
              </div>
            ) : null}

            {query.trim() && visibleResults.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[var(--color-border)] bg-white/65 px-5 py-6 text-sm leading-7 text-[var(--color-muted)]">
                No results found. Try a page title, a route like <code>/davening</code>, or a keyword from the page copy.
              </div>
            ) : null}

            {visibleResults.length > 0 ? (
              <div className="grid gap-2">
                {visibleResults.map((result, index) => (
                  <button
                    key={result.path}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => navigateTo(result.path)}
                    className={`grid w-full gap-2 rounded-[22px] border px-4 py-4 text-left transition ${
                      index === selectedIndex
                        ? "border-[var(--color-border-strong)] bg-[var(--color-surface-strong)]"
                        : "border-[var(--color-border)] bg-white/78"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-base text-[var(--color-foreground)]">{result.title}</strong>
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        {TYPE_LABELS[result.type] ?? "Page"}
                      </span>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{result.path}</div>
                    <div className="text-sm leading-6 text-[var(--color-muted)]">
                      {result.excerpt || result.description || "Open this page"}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] bg-white/55 px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)] sm:px-5">
            <span>Use ↑ ↓ to move</span>
            <span>Enter to open</span>
            <Link href={query.trim() ? `/search?q=${encodeURIComponent(query)}` : "/search"} onClick={() => setOpen(false)}>
              Full search page
            </Link>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
