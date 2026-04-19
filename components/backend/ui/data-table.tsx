"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Checkbox } from "./field";
import { EmptyState, Skeleton } from "./feedback";
import styles from "./data-table.module.css";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | Date | null | undefined;
  exportValue?: (row: T) => string | number | null | undefined;
  width?: string;
  align?: "left" | "right" | "center";
  /** Hide on mobile-stacked layout (used for very wide columns). */
  hideOnMobile?: boolean;
};

export type DataTableSort = { columnId: string; direction: "asc" | "desc" };

export type DataTableBulkAction<T> = {
  label: string;
  onClick: (rows: T[]) => void | Promise<void>;
  destructive?: boolean;
  disabled?: (rows: T[]) => boolean;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowId: (row: T) => string | number;
  loading?: boolean;
  loadingRows?: number;
  selectable?: boolean;
  selected?: Set<string | number>;
  onSelectionChange?: (selected: Set<string | number>) => void;
  bulkActions?: DataTableBulkAction<T>[];
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort | undefined) => void;
  emptyState?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  exportFilename?: string;
  pagination?: {
    page?: number;
    pageSize: number;
    totalLoaded?: number;
    hasMore?: boolean;
    onLoadMore?: () => void;
  };
  caption?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowId,
  loading,
  loadingRows = 6,
  selectable,
  selected,
  onSelectionChange,
  bulkActions,
  sort,
  onSortChange,
  emptyState,
  rowActions,
  exportFilename,
  pagination,
  caption,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<DataTableSort | undefined>(sort);
  const activeSort = sort ?? internalSort;

  const sortedRows = useMemo(() => {
    if (!activeSort) return rows;
    const col = columns.find((c) => c.id === activeSort.columnId);
    if (!col?.sortValue) return rows;
    const direction = activeSort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * direction;
      if (av > bv) return 1 * direction;
      return 0;
    });
  }, [rows, activeSort, columns]);

  const allIds = useMemo(() => sortedRows.map(rowId), [sortedRows, rowId]);
  const allSelected =
    selectable && selected && allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected =
    selectable && selected && allIds.some((id) => selected.has(id));

  const selectedRows = useMemo(
    () => (selected ? sortedRows.filter((row) => selected.has(rowId(row))) : []),
    [sortedRows, selected, rowId],
  );

  function toggleSort(colId: string) {
    if (!onSortChange && !activeSort) return;
    const next: DataTableSort | undefined =
      activeSort?.columnId === colId
        ? activeSort.direction === "asc"
          ? { columnId: colId, direction: "desc" }
          : undefined
        : { columnId: colId, direction: "asc" };
    if (onSortChange) onSortChange(next);
    else setInternalSort(next);
  }

  function toggleSelectAll(checked: boolean) {
    if (!onSelectionChange || !selected) return;
    const next = new Set(selected);
    if (checked) allIds.forEach((id) => next.add(id));
    else allIds.forEach((id) => next.delete(id));
    onSelectionChange(next);
  }

  function toggleRow(id: string | number, checked: boolean) {
    if (!onSelectionChange || !selected) return;
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  }

  function exportCsv() {
    const headers = columns.filter((c) => c.exportValue || typeof c.header === "string");
    const headerRow = headers.map((c) => quoteCsv(typeof c.header === "string" ? c.header : c.id));
    const rowsToExport = selectedRows.length ? selectedRows : sortedRows;
    const dataRows = rowsToExport.map((row) =>
      headers
        .map((c) => quoteCsv(c.exportValue ? String(c.exportValue(row) ?? "") : ""))
        .join(","),
    );
    const csv = [headerRow.join(","), ...dataRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFilename ?? "export"}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.wrapper}>
      {selectable && selectedRows.length > 0 ? (
        <div className={styles.bulkBar}>
          <span>
            {selectedRows.length} selected
            {selectedRows.length === sortedRows.length ? " (all on page)" : ""}
          </span>
          <div className={styles.bulkActions}>
            {bulkActions?.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => action.onClick(selectedRows)}
                disabled={action.disabled?.(selectedRows) ?? false}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--bk-radius-md)",
                  border: `1px solid ${action.destructive ? "var(--bk-danger)" : "var(--bk-accent-strong)"}`,
                  background: action.destructive ? "var(--bk-danger)" : "var(--bk-accent)",
                  color: "var(--bk-text-inverse)",
                  fontWeight: 700,
                  fontSize: "var(--bk-text-sm)",
                  cursor: "pointer",
                }}
              >
                {action.label}
              </button>
            ))}
            {exportFilename ? (
              <button
                type="button"
                onClick={exportCsv}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--bk-radius-md)",
                  border: "1px solid var(--bk-border-strong)",
                  background: "var(--bk-surface)",
                  color: "var(--bk-text-soft)",
                  fontWeight: 700,
                  fontSize: "var(--bk-text-sm)",
                  cursor: "pointer",
                }}
              >
                Export CSV
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onSelectionChange?.(new Set())}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--bk-radius-md)",
                border: 0,
                background: "transparent",
                color: "var(--bk-accent-strong)",
                fontWeight: 700,
                fontSize: "var(--bk-text-sm)",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.scroll}>
        <table className={styles.table}>
          {caption ? <caption style={{ position: "absolute", left: -10000 }}>{caption}</caption> : null}
          <thead>
            <tr>
              {selectable ? (
                <th className={styles.checkboxCell}>
                  <Checkbox
                    aria-label="Select all"
                    checked={Boolean(allSelected)}
                    ref={(el: HTMLInputElement | null) => {
                      if (el) el.indeterminate = !allSelected && Boolean(someSelected);
                    }}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
              ) : null}
              {columns.map((col) => {
                const isActive = activeSort?.columnId === col.id;
                const sortable = Boolean(col.sortValue);
                return (
                  <th
                    key={col.id}
                    style={{ width: col.width, textAlign: col.align ?? "left" }}
                  >
                    {sortable ? (
                      <span
                        className={styles.sortable}
                        onClick={() => toggleSort(col.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSort(col.id);
                          }
                        }}
                      >
                        {col.header}
                        <span className={`${styles.sortIcon} ${isActive ? styles.sortIconActive : ""}`}>
                          {isActive && activeSort?.direction === "desc" ? "▼" : "▲"}
                        </span>
                      </span>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
              {rowActions ? <th className={styles.actionsCell}>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: loadingRows }).map((_, idx) => (
                <tr key={`skel-${idx}`} className={styles.skeletonRow}>
                  {selectable ? (
                    <td className={styles.checkboxCell}>
                      <Skeleton width={16} height={16} />
                    </td>
                  ) : null}
                  {columns.map((col) => (
                    <td key={col.id}>
                      <Skeleton width={`${50 + Math.random() * 50}%`} />
                    </td>
                  ))}
                  {rowActions ? (
                    <td className={styles.actionsCell}>
                      <Skeleton width={60} />
                    </td>
                  ) : null}
                </tr>
              ))
            ) : sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className={styles.empty}
                >
                  {emptyState ?? (
                    <EmptyState title="No results" description="Try changing your filters or search query." />
                  )}
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => {
                const id = rowId(row);
                const isSelected = selected?.has(id) ?? false;
                return (
                  <tr key={id} className={isSelected ? styles.selected : ""}>
                    {selectable ? (
                      <td className={styles.checkboxCell}>
                        <Checkbox
                          aria-label="Select row"
                          checked={isSelected}
                          onChange={(e) => toggleRow(id, e.target.checked)}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        style={{ textAlign: col.align ?? "left" }}
                        data-label={typeof col.header === "string" ? col.header : col.id}
                      >
                        {col.accessor(row)}
                      </td>
                    ))}
                    {rowActions ? (
                      <td className={styles.actionsCell} data-label="Actions">
                        {rowActions(row)}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination || (sortedRows.length > 0 && exportFilename) ? (
        <div className={styles.footerBar}>
          <span>
            {pagination?.totalLoaded
              ? `${pagination.totalLoaded.toLocaleString()} loaded`
              : `${sortedRows.length.toLocaleString()} ${sortedRows.length === 1 ? "row" : "rows"}`}
          </span>
          <div className={styles.pageNav}>
            {pagination?.hasMore && pagination.onLoadMore ? (
              <button
                type="button"
                onClick={pagination.onLoadMore}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--bk-radius-md)",
                  border: "1px solid var(--bk-border-strong)",
                  background: "var(--bk-surface)",
                  color: "var(--bk-text-soft)",
                  fontWeight: 700,
                  fontSize: "var(--bk-text-sm)",
                  cursor: "pointer",
                }}
              >
                Load more
              </button>
            ) : null}
            {exportFilename && sortedRows.length > 0 ? (
              <button
                type="button"
                onClick={exportCsv}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--bk-radius-md)",
                  border: "1px solid var(--bk-border-strong)",
                  background: "var(--bk-surface)",
                  color: "var(--bk-text-soft)",
                  fontWeight: 700,
                  fontSize: "var(--bk-text-sm)",
                  cursor: "pointer",
                }}
              >
                Export CSV
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function quoteCsv(value: string): string {
  const stringValue = value.replace(/"/g, '""');
  if (/[",\n]/.test(stringValue)) return `"${stringValue}"`;
  return stringValue;
}
