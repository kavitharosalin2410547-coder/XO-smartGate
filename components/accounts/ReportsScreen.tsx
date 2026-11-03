"use client";

import React, { useEffect, useMemo, useState } from "react";
import { addDays, fmtDate, inr, type ReportColumn, type ReportResult } from "@/lib/accounts";
import { ACCOUNTS_TODAY, ledger } from "@/lib/accounts-app";
import { exportPdf, exportXlsx, fileName, type ExportTable } from "@/lib/export";
import { useSmartGate } from "../SmartGateContext";
import CarPlate from "../CarPlate";
import { EmptyState, ErrorRetryState, LoadingPlaceholderRows, NoPermissionState } from "../StateHandlers";
import DataTable, { type Col } from "./DataTable";
import { Banner, C, DateBox, OutlineButton, PageTitle, PrimaryButton, SelectBox, cardStyle, useQuery } from "./kit";

type Row = Record<string, string | number | null>;

const FIRST_DAY = "2026-10-01";

// One line under each report name in the list
const BLURB: Record<string, string> = {
  "daily-collection": "Pine Labs and cash by centre",
  membership: "Wash plans sold",
  "purchase-cost": "Parts bought, with GST",
  discounts: "Who gave which discount",
};

function cell(c: ReportColumn, v: string | number | null): React.ReactNode {
  if (v === null || v === undefined || v === "") return <span style={{ color: "#94A3B8" }}>—</span>;
  if (c.kind === "money") return inr(Number(v));
  if (c.kind === "int") return Number(v).toLocaleString("en-IN");
  if (c.kind === "pct") return `${v}%`;
  if (c.kind === "plate") {
    const [plate, mm] = String(v).split("\n");
    return <CarPlate plate={plate} makeModel={mm === "Details pending" ? null : mm} compact />;
  }
  return String(v);
}

function toExport(rep: ReportResult): ExportTable {
  const cols = rep.columns.map((c) => ({ label: c.label, kind: c.kind, align: c.align }));
  return {
    title: rep.title,
    subtitle: rep.subtitle,
    note: rep.note,
    columns: cols,
    rows: rep.rows.map((r) => rep.columns.map((c) => r[c.key] ?? null)),
    totals: rep.totals ? rep.columns.map((c) => rep.totals![c.key] ?? null) : null,
  };
}

export default function ReportsScreen() {
  const { user, showToast, setIsSaving } = useSmartGate();
  const list = ledger.reportsForRole(user.role);
  const centres = ledger.centresFor(user, ["Owner", "Accounts", "Admin", "Manager", "Purchase"]);
  const multi = centres.length > 1;

  const [reportId, setReportId] = useState("daily-collection");
  const [from, setFrom] = useState(ACCOUNTS_TODAY);
  const [to, setTo] = useState(ACCOUNTS_TODAY);
  const [centre, setCentre] = useState("all");
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [busy, setBusy] = useState(false);
  const [listOpen, setListOpen] = useState(true); // show or hide the report list
  const [full, setFull] = useState(false); // full-screen view of the report

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [full]);

  const active = list.find((r) => r.id === reportId) ?? list[0];
  const allowed = multi ? ["all", ...centres.map((c) => c.id)] : centres.map((c) => c.id);
  const eff = allowed.includes(centre) ? centre : allowed[0] ?? centre;

  const [q, reload] = useQuery(
    () => {
      if (!active) throw new Error("No reports for this role");
      return ledger.buildReport(user, { report: active.id, from, to, centreId: eff });
    },
    [active?.id, from, to, eff, user.role, user.centreId]
  );

  const rep = q.status === "ready" ? q.data : null;
  const columns: Col<Row>[] = useMemo(
    () =>
      (rep?.columns ?? []).map((c) => ({
        key: c.key,
        label: c.label,
        align: c.align,
        sort: (r: Row) => (c.kind === "plate" ? String(r[c.key] ?? "") : (r[c.key] as string | number) ?? ""),
        render: (r: Row) => cell(c, r[c.key] ?? null),
      })),
    [rep]
  );

  if (list.length === 0 || q.status === "denied") return <NoPermissionState role={user.role} required="Owner, Admin / Manager, Accounts or Purchase" />;

  const centreSlug = eff === "all" ? "all-centres" : eff;
  const stamp = from === to ? from : `${from}_to_${to}`;

  const download = async () => {
    if (!rep) return;
    setBusy(true);
    setIsSaving(true);
    try {
      const name = fileName([active.id, centreSlug, stamp], format);
      if (format === "pdf") await exportPdf(name, toExport(rep));
      else exportXlsx(name, toExport(rep), rep.title.slice(0, 31));
      showToast(`Downloaded ${name}`, "success");
    } catch {
      showToast("Couldn't create the file. Try again", "error");
    } finally {
      setBusy(false);
      setIsSaving(false);
    }
  };

  const toggleList = (
    <OutlineButton small onClick={() => setListOpen((v) => !v)} title={listOpen ? "Hide the report list to give the table more room" : "Show the report list"}>
      {listOpen ? "Hide list" : "Show list"}
    </OutlineButton>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageTitle title="Reports" sub="Pick a report, set the dates, then view it here or download it." />

      {/* one tidy bar: what to show on the left, how to save it on the right */}
      <div
        style={{
          ...cardStyle,
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px 24px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <DateBox label="From" value={from} min={FIRST_DAY} max={to} onChange={setFrom} />
          <DateBox label="To" value={to} min={from} max={ACCOUNTS_TODAY} onChange={setTo} />
          <SelectBox
            label="Centre"
            value={eff}
            onChange={setCentre}
            disabled={!multi}
            options={[...(multi ? [{ value: "all", label: "All centres" }] : []), ...centres.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div role="group" aria-label="File format" style={{ display: "inline-flex", backgroundColor: "#E6F0F4", padding: "3px", borderRadius: "999px" }}>
            {(["pdf", "xlsx"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={format === f}
                onClick={() => setFormat(f)}
                style={{ border: "none", borderRadius: "999px", padding: "6px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer", background: format === f ? "linear-gradient(135deg, #246C8A 0%, #10303F 100%)" : "transparent", color: format === f ? "#FFFFFF" : "#1A4D64", fontFamily: "inherit" }}
              >
                {f === "pdf" ? "PDF" : "Excel"}
              </button>
            ))}
          </div>
          <PrimaryButton onClick={download} disabled={!rep || busy}>
            {busy ? "Saving…" : "Download"}
          </PrimaryButton>
        </div>
      </div>

      <div className={`sg-reports-grid${listOpen ? "" : " list-hidden"}`}>
        {/* report list */}
        {listOpen && (
          <nav aria-label="Reports" style={{ ...cardStyle, padding: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ padding: "8px 10px 6px", fontSize: "12px", fontWeight: 600, color: C.muted }}>Choose a report</div>
            {list.map((r) => {
              const on = r.id === active.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReportId(r.id)}
                  aria-current={on ? "true" : undefined}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "none",
                    borderLeft: `3px solid ${on ? "#246C8A" : "transparent"}`,
                    backgroundColor: on ? "#E6F0F4" : "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <span style={{ fontSize: "13.5px", fontWeight: on ? 700 : 600, color: on ? C.navy : "#33414C" }}>{r.label}</span>
                  <span style={{ fontSize: "12px", color: C.muted }}>{BLURB[r.id] ?? ""}</span>
                </button>
              );
            })}
          </nav>
        )}

        <div style={{ minWidth: 0 }}>
          {q.status === "loading" && <LoadingPlaceholderRows rows={5} />}
          {q.status === "error" && <ErrorRetryState message={q.message} onRetry={reload} />}

          {rep && (
            <div
              style={
                full
                  ? { position: "fixed", inset: 0, zIndex: 80, background: "#FFFFFF", padding: "22px 28px", display: "flex", flexDirection: "column", gap: "14px", overflow: "auto" }
                  : { ...cardStyle, padding: "20px 22px", display: "flex", flexDirection: "column", gap: "16px" }
              }
              role={full ? "dialog" : undefined}
              aria-modal={full ? true : undefined}
              aria-label={full ? rep.title : undefined}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, color: C.navy, margin: 0 }}>{rep.title}</h2>
                  <div style={{ fontSize: "13px", color: C.muted, marginTop: "3px" }}>{rep.subtitle}</div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  {!full && toggleList}
                  {full ? (
                    <>
                      <PrimaryButton small onClick={download} disabled={busy}>
                        {busy ? "Saving…" : `Download ${format === "pdf" ? "PDF" : "Excel"}`}
                      </PrimaryButton>
                      <OutlineButton small onClick={() => setFull(false)}>
                        Close
                      </OutlineButton>
                    </>
                  ) : (
                    <OutlineButton small onClick={() => setFull(true)} title="View this report full screen">
                      Expand
                    </OutlineButton>
                  )}
                </div>
              </div>

              {rep.note && <Banner tone="info">{rep.note}</Banner>}

              {rep.rows.length === 0 ? (
                <EmptyState message="No data for these dates." />
              ) : (
                <DataTable
                  flat
                  rows={rep.rows}
                  columns={columns}
                  rowKey={(r) => JSON.stringify(r)}
                  filterText={rep.rows.length > 8 ? (r) => Object.values(r).join(" ") : undefined}
                  empty="No data for these dates."
                  footer={
                    rep.totals ? (
                      <tr>
                        {rep.columns.map((c) => (
                          <td key={c.key} style={{ padding: "11px 14px", textAlign: c.align ?? "left", fontWeight: 700, color: C.navy, backgroundColor: "#F1F5F9", whiteSpace: "nowrap" }}>
                            {rep.totals![c.key] === null || rep.totals![c.key] === undefined ? "" : cell(c, rep.totals![c.key])}
                          </td>
                        ))}
                      </tr>
                    ) : undefined
                  }
                />
              )}
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                {fmtDate(from)}
                {from === to ? "" : ` to ${fmtDate(to)}`} · Dev Ventures standard format · The file is named {active.id}_{centreSlug}_{stamp}.{format}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
