"use client";

import type { ReactNode } from "react";

import { Alert, EmptyState, SkeletonStack, Spinner } from "@/components/backend/ui/feedback";
import { Button } from "@/components/backend/ui/button";

import type { ResourceState } from "./use-resource";

type DataStateProps<T> = {
  resource: ResourceState<T>;
  /** Render the skeleton layout for the loading state. Defaults to a 4-line shimmer. */
  loading?: ReactNode;
  /** When the resource resolves but has no useful content (e.g., empty list). */
  empty?: { title: ReactNode; description?: ReactNode; actions?: ReactNode };
  /** Decide whether `data` is empty. Defaults to `Array.isArray(data) && data.length === 0`. */
  isEmpty?: (data: T) => boolean;
  /** Children render when data is loaded. */
  children: (data: T) => ReactNode;
  /** Hide refresh button on the error alert (e.g., for non-retriable errors). */
  noRetry?: boolean;
};

export function DataState<T>({
  resource,
  loading,
  empty,
  isEmpty,
  children,
  noRetry,
}: DataStateProps<T>) {
  if (resource.initial) {
    return <>{loading ?? <SkeletonStack rows={5} />}</>;
  }
  if (resource.error && resource.data === undefined) {
    return (
      <Alert tone="danger" title="Couldn’t load this section">
        <p style={{ margin: "0 0 8px" }}>{resource.error}</p>
        {!noRetry ? (
          <Button size="sm" onClick={() => void resource.refresh()}>
            Try again
          </Button>
        ) : null}
      </Alert>
    );
  }
  if (resource.data === undefined) {
    return <SkeletonStack rows={3} />;
  }
  const emptyDecider = isEmpty ?? defaultIsEmpty;
  if (empty && emptyDecider(resource.data)) {
    return <EmptyState title={empty.title} description={empty.description} actions={empty.actions} />;
  }
  return (
    <>
      {resource.loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            color: "var(--bk-text-muted)",
            fontSize: "var(--bk-text-xs)",
            gap: 6,
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Spinner inline /> Refreshing…
        </div>
      ) : null}
      {resource.error ? (
        <div style={{ marginBottom: 8 }}>
          <Alert tone="warning">{resource.error}</Alert>
        </div>
      ) : null}
      {children(resource.data)}
    </>
  );
}

function defaultIsEmpty<T>(data: T): boolean {
  if (Array.isArray(data)) return data.length === 0;
  return false;
}
