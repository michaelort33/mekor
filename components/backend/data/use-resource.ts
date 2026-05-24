"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ResourceState<T> = {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  /** True only on the first load (data is undefined and loading). */
  initial: boolean;
  refresh: () => Promise<void>;
  setData: (next: T | ((prev: T | undefined) => T)) => void;
};

export type UseResourceOptions = {
  /** Optional poll interval in ms. Pass undefined to disable polling. */
  pollMs?: number;
  /** When true, skip fetching (useful when waiting on a dep). Defaults to false. */
  skip?: boolean;
};

/**
 * Generic data-fetching hook for backend pages.
 * - Tracks loading / error / data
 * - Exposes refresh()
 * - Cancels in-flight requests on unmount or dep change
 * - Optional polling
 */
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown>,
  options: UseResourceOptions = {},
): ResourceState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(!options.skip);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(undefined);
      try {
        const next = await fetcherRef.current(signal);
        if (!signal.aborted) setData(next);
      } catch (err) {
        if (signal.aborted) return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (options.skip) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void run(controller.signal);

    let timer: ReturnType<typeof setInterval> | undefined;
    if (options.pollMs && options.pollMs > 0) {
      timer = setInterval(() => {
        if (document.visibilityState === "visible") {
          const ctrl = new AbortController();
          void run(ctrl.signal);
        }
      }, options.pollMs);
    }

    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, options.skip, options.pollMs]);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    await run(controller.signal);
  }, [run]);

  const setDataExternal = useCallback((next: T | ((prev: T | undefined) => T)) => {
    setData((prev) => (typeof next === "function" ? (next as (p: T | undefined) => T)(prev) : next));
  }, []);

  return {
    data,
    error,
    loading,
    initial: loading && data === undefined,
    refresh,
    setData: setDataExternal,
  };
}

/**
 * Convenience: fetch JSON from a URL with standard error handling.
 * Throws Error with the parsed `error` field when the API returns one.
 */
export async function fetchJson<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const errMessage =
      typeof body === "object" && body && "error" in body
        ? typeof (body as { error: unknown }).error === "string"
          ? (body as { error: string }).error
          : (body as { error: { message?: string } }).error?.message ?? `Request failed (${res.status})`
        : `Request failed (${res.status})`;
    throw new Error(errMessage);
  }
  return body as T;
}
