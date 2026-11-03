"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fmtDate, inr, isDate, type ReceiptRow } from "@/lib/accounts";
import { ACCOUNTS_TODAY, ledger } from "@/lib/accounts-app";
import { exportXlsx, fileName } from "@/lib/export";
import { useSmartGate } from "../SmartGateContext";
import CarPlate from "../CarPlate";
import { ErrorRetryState, LoadingPlaceholderRows, NoPermissionState } from "../StateHandlers";
import DataTable, { type Col } from "./DataTable";
import BillDrawer, { STATUS_TONE } from "./BillDrawer";
import { Banner, C, DateBox, LinkButton, Modal, OutlineButton, PageTitle, Pill, PrimaryButton, SelectBox, SummaryCard, cardStyle, useQuery } from "./kit";

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));
const FIRST_DAY = "2026-10-01";
/** A time stamp in India time as an ISO-looking string (spec 3.5). */
const ist = (ms: number) => new Date(ms + 330 * 60_000).toISOString();

export default function ReconciliationScreen() {
  const { user, showToast, setIsSaving } = useSmartGate();
  const centres = ledger.centresFor(user);
  const multi = centres.length > 1;

  const [date, setDate] = useState(ACCOUNTS_TODAY);
  const [centre, setCentre] = useState("service-a");
  const [bill, setBill] = useState<string | null>(null);
  const [explain, setExplain] = useState<{ key: string; label: string; note: string } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // links from alerts: /reconciliation?centre=wash-1&date=2026-11-02
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("centre");
    const d = p.get("date");
    if (c) setCentre(c);
    if (d && isDate(d) && d <= ACCOUNTS_TODAY && d >= FIRST_DAY) setDate(d);
  }, []);

  const allowed = multi ? ["all", ...centres.map((c) => c.id)] : centres.map((c) => c.id);
  const eff = allowed.includes(centre) ? centre : allowed[0] ?? centre;

  const [q, reload] = useQuery(() => ledger.getReconciliation(user, { date, centreId: eff }), [date, eff, user.role, user.centreId, user.name]);

  const data = q.status === "ready" ? q.data : null;
  useEffect(() => {
    if (data) setCashInput(data.summary.cashCounted === null ? "" : String(data.summary.cashCounted));
    setFormError(null);
  }, [data?.summary.cashCounted, date, eff]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(fn: () => void, done: string): Promise<boolean> {
    setSaving(true);
    setIsSaving(true);
    try {
      await tick(180); // stands in for the call to the server
      fn();
      reload();
      showToast(done, "success");
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't save. Try again", "error");
      return false;
    } finally {
      setSaving(false);
      setIsSaving(false);
    }
  }

  const centreName = eff === "all" ? "All centres" : centres.find((c) => c.id === eff)?.name ?? "";

  const columns: Col<ReceiptRow>[] = useMemo(
    () => [
      {
        key: "receipt",
        label: "Receipt",
        sort: (r) => r.no,
        render: (r) => (
          <button type="button" onClick={(e) => (e.stopPropagation(), setBill(r.id))} style={{ background: "none", border: "none", padding: 0, color: C.blue, fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
            {r.id}
          </button>
        ),
      },
      { key: "customer", label: "Customer", sort: (r) => r.customer, render: (r) => <span style={{ fontWeight: 500 }}>{r.customer}</span> },
      { key: "vehicle", label: "Vehicle", sort: (r) => r.plate, render: (r) => <CarPlate plate={r.plate} makeModel={r.makeModel} compact /> },
      { key: "mode", label: "Mode", sort: (r) => r.mode, render: (r) => r.mode },
      { key: "amount", label: "Amount", align: "right", sort: (r) => r.amount, render: (r) => <span style={{ fontWeight: 600 }}>{inr(r.amount)}</span> },
      { key: "status", label: "Status", sort: (r) => r.status, render: (r) => <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill> },
      {
        key: "note",
        label: "Explanation",
        wrap: true,
        render: (r) => (
          <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-block", maxWidth: "230px" }}>
            {r.status === "Matched" ? (
              <span style={{ color: "#94A3B8" }}>—</span>
            ) : r.note ? (
              <span style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ color: C.ink, fontSize: "12.5px" }}>{r.note}</span>
                {data?.canEdit && <LinkButton onClick={() => setExplain({ key: r.id, label: `${r.id} · ${r.status}`, note: r.note ?? "" })}>Edit</LinkButton>}
              </span>
            ) : data?.canEdit ? (
              <LinkButton onClick={() => setExplain({ key: r.id, label: `${r.id} · ${r.status}`, note: "" })}>Add explanation</LinkButton>
            ) : (
              <span style={{ color: C.muted, fontSize: "12.5px" }}>No explanation yet</span>
            )}
          </span>
        ),
      },
    ],
    [data?.canEdit] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (q.status === "denied") return <NoPermissionState role={user.role} required="Accounts, Owner or the centre's Admin / Manager" />;

  const exportExcel = () => {
    if (!data) return;
    exportXlsx(
      fileName(["reconciliation", eff === "all" ? "all-centres" : eff, date], "xlsx"),
      {
        title: "Daily reconciliation",
        subtitle: `Dev Ventures · ${centreName} · ${fmtDate(date)}`,
        columns: [
          { label: "Receipt" },
          { label: "Time" },
          { label: "Customer" },
          { label: "Vehicle", kind: "plate" },
          { label: "Mode" },
          { label: "Amount", kind: "money", align: "right" },
          { label: "Status" },
          { label: "Explanation" },
        ],
        rows: data.receipts.map((r) => [r.id, r.time, r.customer, `${r.plate}\n${r.makeModel ?? "Details pending"}`, r.mode, r.amount, r.status, r.note ?? ""]),
        totals: ["Total", null, null, null, null, data.summary.receiptsTotal, null, null],
      },
      "Reconciliation"
    );
  };

  const saveCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const n = Number(cashInput.replace(/[,\s₹]/g, ""));
    if (cashInput.trim() === "" || !Number.isInteger(n) || n < 0) {
      setFormError("Enter the cash counted as a whole number of rupees");
      return;
    }
    setFormError(null);
    await act(() => ledger.setCashCounted(user, { date, centreId: eff, amount: n }), "Cash count saved");
  };

  const s = data?.summary;
  const cashNote = data?.differences.find((d) => d.key === "cash");
  const closeDisabled = !data || !data.canClose || data.blockers.length > 0 || eff === "all";
  const closeTitle = !data
    ? ""
    : data.closed
      ? "This day is already closed"
      : !data.canClose
        ? "Only Accounts and Owner can close a day"
        : eff === "all"
          ? "Choose one centre to close its day"
          : data.blockers.length
            ? data.blockers.join(" · ")
            : "Lock this day";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <PageTitle title="Daily reconciliation" sub="Match Pine Labs and cash to receipts every day, down to each customer and vehicle." />

      {/* filters and the two main buttons (mock-up W5) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <DateBox label="Date:" value={date} min={FIRST_DAY} max={ACCOUNTS_TODAY} onChange={setDate} />
          <SelectBox
            label="Centre:"
            value={eff}
            onChange={setCentre}
            disabled={!multi}
            options={[...(multi ? [{ value: "all", label: "All centres" }] : []), ...centres.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <OutlineButton onClick={exportExcel} disabled={!data || data.receipts.length === 0}>
            Export Excel
          </OutlineButton>
          <PrimaryButton onClick={() => setConfirmClose(true)} disabled={closeDisabled || saving} title={closeTitle}>
            {data?.closed ? "Day closed" : "Close day"}
          </PrimaryButton>
        </div>
      </div>

      {q.status === "loading" && <LoadingPlaceholderRows rows={6} />}
      {q.status === "error" && <ErrorRetryState message={q.message} onRetry={reload} />}

      {data && s && (
        <>
          {data.closed ? (
            <Banner tone="ok">
              Day closed by {data.closed.by} ({data.closed.role}) on {fmtDate(ist(data.closed.at).slice(0, 10))} at {ist(data.closed.at).slice(11, 16)}. It is locked and can&apos;t be changed.
            </Banner>
          ) : !["Owner", "Accounts"].includes(user.role) ? (
            <Banner tone="info">You can see your centre&apos;s reconciliation. Only Accounts and Owner can enter cash counted, add explanations or close a day.</Banner>
          ) : eff === "all" ? (
            <Banner tone="info">Showing all centres. Choose one centre to enter its cash counted or close its day.</Banner>
          ) : data.blockers.length > 0 ? (
            <Banner tone="warn">To close this day: {data.blockers.join(" · ")}.</Banner>
          ) : (
            <Banner tone="ok">Every difference has a note. You can close this day.</Banner>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
            <SummaryCard label="Receipts" value={inr(s.receiptsTotal)}>
              <span style={{ color: C.muted }}>
                {s.receiptsCount} receipt{s.receiptsCount === 1 ? "" : "s"} · Pine Labs {inr(s.pineTotal)} · Cash {inr(s.cashTotal)}
              </span>
            </SummaryCard>

            <SummaryCard label="Pine Labs settled" value={inr(s.pineSettled)}>
              {s.pineUnsettled === 0 ? <Pill tone="green">Matched</Pill> : <Pill tone="orange">{inr(s.pineUnsettled)} not settled</Pill>}
            </SummaryCard>

            <SummaryCard label="Cash counted" value={s.cashCounted === null ? <span style={{ color: "#94A3B8", fontSize: "18px" }}>Not counted yet</span> : inr(s.cashCounted)}>
              {s.cashCounted === null ? (
                <Pill tone="grey">Expected {inr(s.cashExpected)}</Pill>
              ) : s.cashDiff === null ? (
                <Pill tone="grey">
                  {s.centresCounted} of {s.centresTotal} centres counted
                </Pill>
              ) : s.cashDiff === 0 ? (
                <Pill tone="green">Matched</Pill>
              ) : (
                <Pill tone="orange">
                  {inr(Math.abs(s.cashDiff))} {s.cashDiff < 0 ? "short" : "extra"}
                </Pill>
              )}
              {s.cashExpected < s.cashTotal && <span style={{ color: C.muted }}>{inr(s.cashTotal - s.cashExpected)} of cash receipts not in the count</span>}
              {cashNote && (
                <span style={{ color: C.ink }}>
                  {cashNote.note ? <em>&ldquo;{cashNote.note}&rdquo; </em> : <span style={{ color: C.muted }}>No explanation yet. </span>}
                  {data.canEdit && <LinkButton onClick={() => setExplain({ key: "cash", label: cashNote.label, note: cashNote.note ?? "" })}>{cashNote.note ? "Edit" : "Add explanation"}</LinkButton>}
                </span>
              )}
              {data.canEdit && (
                <form onSubmit={saveCash} style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid #CBD5E1", borderRadius: "8px", padding: "0 10px", height: "32px", backgroundColor: "#F8FAFC" }}>
                    <span style={{ color: C.muted }}>₹</span>
                    <input
                      inputMode="numeric"
                      aria-label="Cash counted"
                      value={cashInput}
                      onChange={(e) => setCashInput(e.target.value)}
                      placeholder="Cash counted"
                      style={{ border: "none", outline: "none", background: "transparent", width: "110px", fontSize: "13px", fontWeight: 600, color: C.navy }}
                    />
                  </label>
                  <OutlineButton type="submit" small disabled={saving}>
                    {saving ? "Saving…" : "Save count"}
                  </OutlineButton>
                </form>
              )}
              {formError && <span style={{ color: C.red }}>{formError}</span>}
            </SummaryCard>
          </div>

          {eff === "all" && multi && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
              {data.centreStates.map((c) => (
                <button
                  key={c.centreId}
                  type="button"
                  onClick={() => setCentre(c.centreId)}
                  style={{ ...cardStyle, padding: "10px 14px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px", fontFamily: "inherit" }}
                >
                  <span style={{ fontWeight: 700, color: C.navy, fontSize: "13.5px" }}>{c.centreName}</span>
                  <span style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: C.muted }}>
                    <Pill tone={c.closed ? "green" : "grey"}>{c.closed ? "Closed" : "Open"}</Pill>
                    <span>{c.differences === 0 ? "No differences" : `${c.differences} difference${c.differences === 1 ? "" : "s"}`}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <DataTable
            rows={data.receipts}
            columns={columns}
            rowKey={(r) => r.id}
            filterText={(r) => `${r.id} ${r.customer} ${r.plate} ${r.makeModel ?? ""} ${r.mode} ${r.status}`}
            onRowClick={(r) => setBill(r.id)}
            rowLabel={(r) => `Open bill ${r.id}`}
            defaultSort={{ key: "receipt", dir: "asc" }}
            empty={date === ACCOUNTS_TODAY ? "No receipts yet today." : "No receipts on this day."}
            footer={
              <tr>
                <td colSpan={4} style={{ padding: "11px 14px", fontWeight: 700, color: C.navy, backgroundColor: "#F1F5F9" }}>
                  Total · {s.receiptsCount} receipts
                </td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700, color: C.navy, backgroundColor: "#F1F5F9" }}>{inr(s.receiptsTotal)}</td>
                <td colSpan={2} style={{ backgroundColor: "#F1F5F9" }} />
              </tr>
            }
          />
        </>
      )}

      {bill && <BillDrawer user={user} receiptId={bill} onClose={() => setBill(null)} />}

      {explain && (
        <Modal title="Explain this difference" onClose={() => setExplain(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await act(() => ledger.setNote(user, { date, centreId: eff, key: explain.key, note: explain.note }), "Explanation saved");
              if (ok) setExplain(null);
            }}
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div style={{ fontSize: "13px", color: C.muted }}>
              {centreName} · {fmtDate(date)} · <strong style={{ color: C.navy }}>{explain.label}</strong>
            </div>
            <textarea
              autoFocus
              required
              maxLength={300}
              rows={4}
              aria-label="Explanation"
              value={explain.note}
              onChange={(e) => setExplain({ ...explain, note: e.target.value })}
              placeholder="What happened? For example: customer paid ₹500 less after a repeat wash."
              style={{ border: "1px solid #CBD5E1", borderRadius: "10px", padding: "10px 12px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", color: C.ink }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <OutlineButton onClick={() => setExplain(null)}>Cancel</OutlineButton>
              <PrimaryButton type="submit" disabled={saving || !explain.note.trim()}>
                {saving ? "Saving…" : "Save explanation"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {confirmClose && (
        <Modal title={`Close ${centreName} for ${fmtDate(date)}?`} onClose={() => setConfirmClose(false)}>
          <p style={{ fontSize: "13.5px", color: C.ink, margin: "0 0 16px", lineHeight: 1.5 }}>
            This locks the day. Nobody, including the Owner, can change its cash count, notes or receipts afterwards.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <OutlineButton onClick={() => setConfirmClose(false)}>Cancel</OutlineButton>
            <PrimaryButton
              disabled={saving}
              onClick={async () => {
                const ok = await act(() => ledger.closeDay(user, { date, centreId: eff }), "Day closed");
                if (ok) setConfirmClose(false);
              }}
            >
              {saving ? "Saving…" : "Close day"}
            </PrimaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
