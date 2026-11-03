"use client";

import React, { useMemo, useState } from "react";
import { AccountsError, GST_PCT, PURCHASE_BACKDATE_DAYS, PURCHASE_CATALOG, PURCHASE_SUPPLIERS, addDays, fmtDate, inr, type PurchaseEntry } from "@/lib/accounts";
import { ACCOUNTS_TODAY, ledger } from "@/lib/accounts-app";
import { exportXlsx, fileName } from "@/lib/export";
import { useSmartGate } from "../SmartGateContext";
import { ErrorRetryState, LoadingPlaceholderRows, NoPermissionState } from "../StateHandlers";
import DataTable, { type Col } from "./DataTable";
import { Banner, C, DateBox, Modal, OutlineButton, PageTitle, PrimaryButton, SelectBox, SummaryCard, cardStyle, useQuery } from "./kit";

const PERIODS = [
  { value: "today", label: "Today", days: 1 },
  { value: "week", label: "This week", days: 7 },
  { value: "month", label: "Last 30 days", days: 30 },
];

const input: React.CSSProperties = {
  width: "100%",
  height: "38px",
  boxSizing: "border-box",
  border: "1px solid #CBD5E1",
  borderRadius: "10px",
  padding: "0 12px",
  fontSize: "13.5px",
  color: C.navy,
  fontFamily: "inherit",
  backgroundColor: "#FFFFFF",
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12.5px", fontWeight: 600, color: C.muted, minWidth: 0 }}>
      {label}
      {children}
      {hint && <span style={{ fontWeight: 400, fontSize: "12px" }}>{hint}</span>}
    </label>
  );
}

export default function PurchaseScreen() {
  const { user, showToast, setIsSaving } = useSmartGate();
  const centres = ledger.centresFor(user, ["Owner", "Accounts", "Admin", "Manager", "Purchase"]);
  const multi = centres.length > 1;

  const [period, setPeriod] = useState("week");
  const [centre, setCentre] = useState("all");
  const [adding, setAdding] = useState(false);

  const days = PERIODS.find((p) => p.value === period)!.days;
  const from = addDays(ACCOUNTS_TODAY, -(days - 1));
  const allowed = multi ? ["all", ...centres.map((c) => c.id)] : centres.map((c) => c.id);
  const eff = allowed.includes(centre) ? centre : allowed[0] ?? centre;

  const [q, reload] = useQuery(
    () => ledger.getPurchases(user, { from, to: ACCOUNTS_TODAY, centreId: eff }),
    [from, eff, user.role, user.centreId]
  );
  const data = q.status === "ready" ? q.data : null;

  const columns: Col<PurchaseEntry>[] = useMemo(
    () => [
      { key: "date", label: "Date", sort: (r) => `${r.date} ${r.id}`, render: (r) => <span style={{ whiteSpace: "nowrap" }}>{fmtDate(r.date)}</span> },
      { key: "centre", label: "Centre", sort: (r) => r.centreName, render: (r) => r.centreName },
      { key: "supplier", label: "Supplier · bill", sort: (r) => r.supplier, render: (r) => <span><span style={{ fontWeight: 600 }}>{r.supplier}</span><br /><span style={{ color: C.muted }}>{r.billNo}</span></span> },
      { key: "item", label: "Item", sort: (r) => r.item, render: (r) => r.item, wrap: true },
      { key: "qty", label: "Qty", align: "right", sort: (r) => r.qty, render: (r) => r.qty },
      { key: "rate", label: "Price each", align: "right", sort: (r) => r.rate, render: (r) => inr(r.rate) },
      { key: "gst", label: `GST ${GST_PCT}%`, align: "right", sort: (r) => r.gst, render: (r) => inr(r.gst) },
      { key: "total", label: "Total", align: "right", sort: (r) => r.total, render: (r) => <span style={{ fontWeight: 700 }}>{inr(r.total)}</span> },
    ],
    []
  );

  if (q.status === "denied") return <NoPermissionState role={user.role} required="Purchase, Owner, Accounts or the centre's Admin / Manager" />;

  const centreName = eff === "all" ? "All centres" : centres.find((c) => c.id === eff)?.name ?? "";

  const exportExcel = () => {
    if (!data) return;
    exportXlsx(
      fileName(["purchases", eff === "all" ? "all-centres" : eff, from === ACCOUNTS_TODAY ? from : `${from}_to_${ACCOUNTS_TODAY}`], "xlsx"),
      {
        title: "Purchases",
        subtitle: `Dev Ventures · ${centreName} · ${fmtDate(from)} to ${fmtDate(ACCOUNTS_TODAY)}`,
        columns: [
          { label: "Date" },
          { label: "Centre" },
          { label: "Supplier" },
          { label: "Bill no." },
          { label: "Item" },
          { label: "Qty", kind: "int", align: "right" },
          { label: "Price each", kind: "money", align: "right" },
          { label: "Amount", kind: "money", align: "right" },
          { label: `GST ${GST_PCT}%`, kind: "money", align: "right" },
          { label: "Total", kind: "money", align: "right" },
        ],
        rows: data.rows.map((r) => [fmtDate(r.date), r.centreName, r.supplier, r.billNo, r.item, r.qty, r.rate, r.amount, r.gst, r.total]),
        totals: ["Total", null, null, null, null, null, null, data.summary.amount, data.summary.gst, data.summary.total],
      },
      "Purchases"
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <PageTitle
        title="Purchases"
        sub={user.role === "Purchase" ? `Parts and supplies bought for ${user.centreName}.` : "What each centre has bought, with GST."}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <SelectBox label="Period:" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} />
          <SelectBox
            label="Centre:"
            value={eff}
            onChange={setCentre}
            disabled={!multi}
            options={[...(multi ? [{ value: "all", label: "All centres" }] : []), ...centres.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <OutlineButton onClick={exportExcel} disabled={!data || data.rows.length === 0}>
            Export
          </OutlineButton>
          {data?.canAdd && <PrimaryButton onClick={() => setAdding(true)}>Add purchase</PrimaryButton>}
        </div>
      </div>

      {q.status === "loading" && <LoadingPlaceholderRows rows={6} />}
      {q.status === "error" && <ErrorRetryState message={q.message} onRetry={reload} />}

      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <SummaryCard label="Purchase bills" value={data.summary.count} />
            <SummaryCard label="Cost before GST" value={inr(data.summary.amount)} />
            <SummaryCard label={`GST ${GST_PCT}%`} value={inr(data.summary.gst)} />
            <SummaryCard label="Total paid" value={inr(data.summary.total)} />
          </div>

          {multi && eff === "all" && (
            <div style={{ ...cardStyle, padding: "16px 20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: C.navy, marginBottom: "10px" }}>By centre</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px" }}>
                {data.byCentre.map((c) => (
                  <button
                    key={c.centreId}
                    type="button"
                    onClick={() => setCentre(c.centreId)}
                    title={`Show only ${c.centreName}`}
                    style={{ textAlign: "left", border: `1px solid ${C.line}`, borderRadius: "10px", background: "#F8FBFC", padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: "2px" }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600, color: C.navy }}>{c.centreName}</span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: C.navy }}>{inr(c.total)}</span>
                    <span style={{ fontSize: "12px", color: C.muted }}>{c.count} bill{c.count === 1 ? "" : "s"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <DataTable
            rows={data.rows}
            columns={columns}
            rowKey={(r) => r.id}
            filterText={(r) => `${r.supplier} ${r.billNo} ${r.item} ${r.centreName}`}
            defaultSort={{ key: "date", dir: "desc" }}
            empty="No purchases in this period."
            footer={
              data.rows.length > 0 ? (
                <tr>
                  {columns.map((c) => (
                    <td key={c.key} style={{ padding: "11px 14px", textAlign: c.align ?? "left", fontWeight: 700, color: C.navy, backgroundColor: "#F1F5F9", whiteSpace: "nowrap" }}>
                      {c.key === "date" ? "Total" : c.key === "gst" ? inr(data.summary.gst) : c.key === "total" ? inr(data.summary.total) : ""}
                    </td>
                  ))}
                </tr>
              ) : undefined
            }
          />
        </>
      )}

      {adding && (
        <AddPurchase
          onClose={() => setAdding(false)}
          onSaved={(e) => {
            setAdding(false);
            showToast(`Purchase saved · ${e.item} · ${inr(e.total)}`, "success");
            setPeriod((p) => p); // keep the filters
            reload();
          }}
          setIsSaving={setIsSaving}
        />
      )}
    </div>
  );
}

function AddPurchase({ onClose, onSaved, setIsSaving }: { onClose: () => void; onSaved: (e: PurchaseEntry) => void; setIsSaving: (v: boolean) => void }) {
  const { user } = useSmartGate();
  const centres = ledger.purchaseCentres(user);
  const [centreId, setCentreId] = useState(centres[0]?.id ?? "");
  const [date, setDate] = useState(ACCOUNTS_TODAY);
  const [supplier, setSupplier] = useState("");
  const [billNo, setBillNo] = useState("");
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("1");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const type = centres.find((c) => c.id === centreId)?.type ?? "service";
  const suggestions = PURCHASE_CATALOG[type];
  const minDate = user.role === "Owner" ? "2026-10-01" : addDays(ACCOUNTS_TODAY, -(PURCHASE_BACKDATE_DAYS - 1));

  const nQty = Number(qty);
  const nRate = Number(rate);
  const amount = Number.isFinite(nQty * nRate) ? Math.max(0, nQty * nRate) : 0;
  const gst = Math.round((amount * GST_PCT) / 100);

  const pickItem = (v: string) => {
    setItem(v);
    const hit = suggestions.find((s) => s.item.toLowerCase() === v.trim().toLowerCase());
    if (hit && !rate) setRate(String(hit.rate)); // fill the usual price; they can change it
  };

  const save = () => {
    setError(null);
    setIsSaving(true);
    try {
      const e = ledger.addPurchase(user, { date, centreId, supplier, billNo, item, qty: Number(qty), rate: Number(rate) });
      onSaved(e);
    } catch (err) {
      setError(err instanceof AccountsError ? err.message : "Couldn't save. Try again");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="Add purchase" onClose={onClose} width={560}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        {error && <Banner tone="danger">{error}</Banner>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Field label="Centre" hint={centres.length === 1 ? "You can only add for your own centre" : undefined}>
            <select value={centreId} onChange={(e) => setCentreId(e.target.value)} disabled={centres.length === 1} style={input} aria-label="Centre">
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Bill date" hint={user.role === "Owner" ? undefined : `Up to ${PURCHASE_BACKDATE_DAYS} days back`}>
            <input type="date" value={date} min={minDate} max={ACCOUNTS_TODAY} onChange={(e) => e.target.value && setDate(e.target.value)} style={input} aria-label="Bill date" />
          </Field>
          <Field label="Supplier">
            <input list="po-suppliers" value={supplier} onChange={(e) => setSupplier(e.target.value)} style={input} placeholder="Who sold it" autoFocus />
            <datalist id="po-suppliers">
              {PURCHASE_SUPPLIERS[type].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Supplier's bill number">
            <input value={billNo} onChange={(e) => setBillNo(e.target.value)} style={input} placeholder="As printed on the bill" />
          </Field>
        </div>
        <Field label="What was bought">
          <input list="po-items" value={item} onChange={(e) => pickItem(e.target.value)} style={input} placeholder="Pick one or type your own" />
          <datalist id="po-items">
            {suggestions.map((s) => (
              <option key={s.item} value={s.item} />
            ))}
          </datalist>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Field label="Quantity">
            <input type="number" min={1} step={1} value={qty} onChange={(e) => setQty(e.target.value)} style={input} />
          </Field>
          <Field label="Price each, before GST (₹)">
            <input type="number" min={1} step={1} value={rate} onChange={(e) => setRate(e.target.value)} style={input} placeholder="0" />
          </Field>
        </div>

        <div style={{ backgroundColor: "#F1F7FA", borderRadius: "10px", padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", fontSize: "12.5px", color: C.muted }}>
          <div>Cost<div style={{ fontSize: "15px", fontWeight: 700, color: C.navy }}>{inr(amount)}</div></div>
          <div>GST {GST_PCT}%<div style={{ fontSize: "15px", fontWeight: 700, color: C.navy }}>{inr(gst)}</div></div>
          <div>Total to pay<div style={{ fontSize: "15px", fontWeight: 700, color: C.navy }}>{inr(amount + gst)}</div></div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <PrimaryButton type="submit">Save purchase</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
