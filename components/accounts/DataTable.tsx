"use client";

import React, { useEffect, useMemo, useState } from "react";
import { C, cardStyle } from "./kit";
import { EmptyState } from "../StateHandlers";

// Table rules from spec 3.5: sort by column, filter, 25 rows per page.

export interface Col<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Makes the column sortable. */
  sort?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  width?: string;
  /** Allow long text in this column to wrap. Cells stay on one line by default. */
  wrap?: boolean;
}

export const PAGE_SIZE = 25;

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  filterText,
  onRowClick,
  rowLabel,
  defaultSort,
  empty,
  footer,
  toolbar,
  flat,
}: {
  rows: T[];
  columns: Col<T>[];
  rowKey: (row: T) => string;
  /** Text each row is searched by. Leave out to hide the filter box. */
  filterText?: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Used for the screen-reader name of a clickable row. */
  rowLabel?: (row: T) => string;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  empty: string;
  footer?: React.ReactNode;
  toolbar?: React.ReactNode;
  /** For a table that already sits inside a card: no shadow, softer corners. */
  flat?: boolean;
}) {
  const [sort, setSort] = useState(defaultSort ?? null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const shown = useMemo(() => {
    let out = rows;
    const needle = q.trim().toLowerCase();
    if (needle && filterText) out = out.filter((r) => filterText(r).toLowerCase().includes(needle));
    const col = sort && columns.find((c) => c.key === sort.key);
    if (col?.sort) {
      const get = col.sort;
      const dir = sort!.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const x = get(a);
        const y = get(b);
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en", { numeric: true })) * dir;
      });
    }
    return out;
  }, [rows, q, sort, columns, filterText]);

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  useEffect(() => setPage(0), [q, sort, rows]);
  const cur = Math.min(page, pages - 1);
  const visible = shown.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);

  const toggle = (c: Col<T>) => {
    if (!c.sort) return;
    setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" }));
  };

  return (
    <div style={{ ...cardStyle, overflow: "hidden", ...(flat ? { boxShadow: "none", borderRadius: "10px" } : {}) }}>
      {(filterText || toolbar) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}>
          {filterText ? (
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter this table…"
              aria-label="Filter this table"
              style={{ width: "260px", height: "34px", borderRadius: "18px", border: "1px solid #CBD5E1", padding: "0 14px", fontSize: "13px", backgroundColor: "#F8FAFC", color: C.navy, outline: "none" }}
            />
          ) : (
            <span />
          )}
          {toolbar}
        </div>
      )}

      {shown.length === 0 ? (
        <div style={{ padding: "0 16px" }}>
          <EmptyState message={q ? "No rows match this filter." : empty} />
        </div>
      ) : (
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "13px", tableLayout: "auto" }}>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : c.sort ? "none" : undefined}
                    style={{ backgroundColor: "#E6F0F4", color: "#1A4D64", borderBottom: "1px solid #CDE0E8", textAlign: c.align ?? "left", padding: 0, width: c.width, fontSize: "12.5px", fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    {c.sort ? (
                      <button
                        type="button"
                        onClick={() => toggle(c)}
                        style={{ all: "unset", cursor: "pointer", display: "block", width: "100%", boxSizing: "border-box", padding: "11px 14px", textAlign: c.align ?? "left" }}
                        title={`Sort by ${c.label}`}
                      >
                        {c.label}
                        <span aria-hidden style={{ marginLeft: "5px", fontSize: "9px", opacity: active ? 1 : 0.35 }}>
                          {active ? (sort!.dir === "asc" ? "▲" : "▼") : "▲▼"}
                        </span>
                      </button>
                    ) : (
                      <span style={{ display: "block", padding: "11px 14px" }}>{c.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick(row)) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                className="sg-acct-row"
                style={{ cursor: onRowClick ? "pointer" : "default" }}
              >
                {columns.map((c) => (
                  <td key={c.key} style={{ padding: "10px 14px", textAlign: c.align ?? "left", borderBottom: "1px solid #EDF2F7", verticalAlign: "middle", color: C.ink, whiteSpace: c.wrap ? "normal" : "nowrap" }}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
        </div>
      )}

      {shown.length > PAGE_SIZE && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: `1px solid ${C.line}`, fontSize: "12.5px", color: C.muted }}>
          <span>
            Showing {cur * PAGE_SIZE + 1}–{Math.min(shown.length, (cur + 1) * PAGE_SIZE)} of {shown.length}
          </span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <PagerButton disabled={cur === 0} onClick={() => setPage(cur - 1)}>
              Previous
            </PagerButton>
            <span>
              Page {cur + 1} of {pages}
            </span>
            <PagerButton disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
              Next
            </PagerButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PagerButton({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "8px", padding: "4px 12px", fontSize: "12.5px", fontWeight: 600, color: disabled ? "#CBD5E1" : C.navy, cursor: disabled ? "default" : "pointer" }}
    >
      {children}
    </button>
  );
}

/** Loading placeholder rows shape, re-exported for screens. */
export { LoadingPlaceholderRows, ErrorRetryState, NoPermissionState } from "../StateHandlers";
