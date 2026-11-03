"use client";

import React, { useMemo, useState } from "react";
import { addDays, fmtDate, inr, type DiscountRow } from "@/lib/accounts";
import { ACCOUNTS_TODAY, ledger } from "@/lib/accounts-app";
import { exportXlsx, fileName } from "@/lib/export";
import { useSmartGate } from "../SmartGateContext";
import CarPlate from "../CarPlate";
import { ErrorRetryState, LoadingPlaceholderRows, NoPermissionState } from "../StateHandlers";
import DataTable, { type Col } from "./DataTable";
import BillDrawer from "./BillDrawer";
import { Banner, C, OutlineButton, PageTitle, SelectBox, SummaryCard, useQuery } from "./kit";

const PERIODS = [
  { value: "today", label: "Today", days: 1 },
  { value: "week", label: "This week", days: 7 },
  { value: "month", label: "Last 30 days", days: 30 },
];

export default function DiscountsScreen() {
  const { user } = useSmartGate();
  const centres = ledger.centresFor(user);
  const multi = centres.length > 1;

  const [period, setPeriod] = useState("week");
  const [centre, setCentre] = useState("all");
  const [approver, setApprover] = useState("all");
  const [bill, setBill] = useState<string | null>(null);

  const days = PERIODS.find((p) => p.value === period)!.days;
  const from = addDays(ACCOUNTS_TODAY, -(days - 1));
  const allowed = multi ? ["all", ...centres.map((c) => c.id)] : centres.map((c) => c.id);
  const eff = allowed.includes(centre) ? centre : allowed[0] ?? centre;

  const [q, reload] = useQuery(
    () => ledger.getDiscounts(user, { from, to: ACCOUNTS_TODAY, centreId: eff, approver }),
    [from, eff, approver, user.role, user.centreId]
  );

  // the approver list follows the other filters; fall back to everyone if the chosen one is not in it
  const data = q.status === "ready" ? q.data : null;
  const approverValue = data && approver !== "all" && !data.approvers.includes(approver) && data.rows.length === 0 ? "all" : approver;

  const columns: Col<DiscountRow>[] = useMemo(
    () => [
      { key: "when", label: "Date · time", sort: (r) => `${r.date} ${r.time}`, render: (r) => <span style={{ whiteSpace: "nowrap" }}>{fmtDate(r.date)}<br /><span style={{ color: C.muted }}>{r.time}</span></span> },
      { key: "centre", label: "Centre", sort: (r) => r.centreName, render: (r) => r.centreName },
      { key: "invoice", label: "Invoice", sort: (r) => r.invoiceNo, render: (r) => <span style={{ fontWeight: 600 }}>{r.invoiceNo}</span> },
      { key: "plate", label: "Car number", sort: (r) => r.plate, render: (r) => <CarPlate plate={r.plate} makeModel={r.makeModel} compact /> },
      {
        key: "pct",
        label: "%",
        align: "right",
        sort: (r) => r.pct,
        render: (r) => (
          <span
            title={r.overCap ? `Above the ${r.cap}% cap for ${r.role}` : r.pct >= 15 ? "Highest discount tier" : undefined}
            style={{ fontWeight: 700, color: r.overCap ? C.red : r.pct >= 15 ? C.amber : C.ink, backgroundColor: r.overCap ? "#FEF2F2" : "transparent", padding: r.overCap ? "2px 7px" : 0, borderRadius: "6px" }}
          >
            {r.pct}%
          </span>
        ),
      },
      { key: "value", label: "Value", align: "right", sort: (r) => r.value, render: (r) => <span style={{ fontWeight: 600 }}>{inr(r.value)}</span> },
      { key: "by", label: "Approved by", sort: (r) => r.approvedBy, render: (r) => r.approvedBy },
      { key: "role", label: "Role", sort: (r) => r.role, render: (r) => <span style={{ color: r.overCap ? C.red : C.muted, fontWeight: r.overCap ? 700 : 500 }}>{r.role}</span> },
    ],
    []
  );

  if (q.status === "denied") return <NoPermissionState role={user.role} required="Accounts, Owner or the centre's Admin / Manager" />;

  const exportExcel = () => {
    if (!data) return;
    exportXlsx(
      fileName(["discounts", eff === "all" ? "all-centres" : eff, from === ACCOUNTS_TODAY ? from : `${from}_to_${ACCOUNTS_TODAY}`], "xlsx"),
      {
        title: "Discount audit",
        subtitle: `Dev Ventures · ${eff === "all" ? "All centres" : centres.find((c) => c.id === eff)?.name} · ${fmtDate(from)} to ${fmtDate(ACCOUNTS_TODAY)}`,
        columns: [
          { label: "Date" },
          { label: "Time" },
          { label: "Centre" },
          { label: "Invoice" },
          { label: "Car number", kind: "plate" },
          { label: "%", kind: "pct", align: "right" },
          { label: "Value", kind: "money", align: "right" },
          { label: "Approved by" },
          { label: "Role" },
        ],
        rows: data.rows.map((r) => [fmtDate(r.date), r.time, r.centreName, r.invoiceNo, `${r.plate}\n${r.makeModel ?? "Details pending"}`, r.pct, r.value, r.approvedBy, r.role]),
        totals: ["Total", null, null, null, null, null, data.summary.value, `${data.summary.count} discounts`, null],
      },
      "Discounts"
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <PageTitle title="Discount audit" sub="Every discount, who gave it, and on which bill." />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <SelectBox label="Period:" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} />
          <SelectBox
            label="Centre:"
            value={eff}
            onChange={(v) => (setCentre(v), setApprover("all"))}
            disabled={!multi}
            options={[...(multi ? [{ value: "all", label: "All centres" }] : []), ...centres.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <SelectBox
            label="Approver:"
            value={approverValue}
            onChange={setApprover}
            options={[{ value: "all", label: "All approvers" }, ...(data?.approvers ?? (approver !== "all" ? [approver] : [])).map((a) => ({ value: a, label: a }))]}
          />
        </div>
        <OutlineButton onClick={exportExcel} disabled={!data || data.rows.length === 0}>
          Export
        </OutlineButton>
      </div>

      {q.status === "loading" && <LoadingPlaceholderRows rows={6} />}
      {q.status === "error" && <ErrorRetryState message={q.message} onRetry={reload} />}

      {data && (
        <>
          {data.summary.overCap > 0 && (
            <Banner tone="danger">
              Alert: {data.summary.overCap} discount{data.summary.overCap === 1 ? " is" : "s are"} above the cap for the role that gave {data.summary.overCap === 1 ? "it" : "them"}. This should never happen. They are marked in red below.
            </Banner>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
            <SummaryCard label="Discounts given" value={data.summary.count} />
            <SummaryCard label="Discount value" value={inr(data.summary.value)} />
            <SummaryCard label="At 15% tier" value={data.summary.atTopTier}>
              <span style={{ color: C.muted }}>Only the Owner can give 15%</span>
            </SummaryCard>
          </div>

          <DataTable
            rows={data.rows}
            columns={columns}
            rowKey={(r) => r.receiptId}
            filterText={(r) => `${r.invoiceNo} ${r.plate} ${r.makeModel ?? ""} ${r.centreName} ${r.approvedBy} ${r.role} ${r.pct}%`}
            onRowClick={(r) => setBill(r.receiptId)}
            rowLabel={(r) => `Open bill ${r.invoiceNo}`}
            defaultSort={{ key: "when", dir: "desc" }}
            empty="No discounts in this period."
          />
        </>
      )}

      {bill && <BillDrawer user={user} receiptId={bill} onClose={() => setBill(null)} />}
    </div>
  );
}
