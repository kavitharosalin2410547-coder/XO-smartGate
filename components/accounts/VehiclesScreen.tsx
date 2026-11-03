"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fmtDate, inr, type VehicleSummary, type VehicleVisit } from "@/lib/accounts";
import { ledger } from "@/lib/accounts-app";
import { exportXlsx, fileName } from "@/lib/export";
import { useSmartGate } from "../SmartGateContext";
import CarPlate from "../CarPlate";
import { EmptyState, ErrorRetryState, LoadingPlaceholderRows, NoPermissionState } from "../StateHandlers";
import DataTable, { type Col } from "./DataTable";
import BillDrawer from "./BillDrawer";
import { C, LinkButton, OutlineButton, PageTitle, PrimaryButton, SummaryCard, cardStyle, useQuery } from "./kit";

export default function VehiclesScreen() {
  const { user } = useSmartGate();
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [bill, setBill] = useState<string | null>(null);

  // /vehicles?q=TN09AB1234, also used by the search box at the top of every page
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  useEffect(() => {
    if (urlQ) {
      setInput(urlQ);
      setSubmitted(urlQ);
      setPicked(null);
    }
  }, [urlQ]);

  const search = (value: string) => {
    const v = value.trim();
    setSubmitted(v);
    setPicked(null);
    try {
      window.history.replaceState(null, "", v ? `/vehicles/?q=${encodeURIComponent(v)}` : "/vehicles/");
    } catch {}
  };

  const [sq, reloadSearch] = useQuery(() => ledger.searchVehicles(user, submitted), [submitted, user.role, user.centreId]);
  const matches = sq.status === "ready" ? sq.data.matches : [];
  const plate = picked ?? (matches.length === 1 ? matches[0].plate : null);

  const [dq, reloadDetail] = useQuery(() => (plate ? ledger.getVehicle(user, plate) : null), [plate, user.role, user.centreId]);
  const detail = dq.status === "ready" ? dq.data : null;

  const columns: Col<VehicleVisit>[] = useMemo(
    () => [
      { key: "when", label: "Date · time", sort: (v) => `${v.date} ${v.time}`, render: (v) => `${fmtDate(v.date)} ${v.time}` },
      { key: "centre", label: "Centre", sort: (v) => v.centreName, render: (v) => v.centreName },
      { key: "job", label: "Job card", sort: (v) => v.jobCard, render: (v) => v.jobCard },
      {
        key: "invoice",
        label: "Invoice",
        sort: (v) => v.invoiceNo,
        render: (v) => (
          <span onClick={(e) => e.stopPropagation()}>
            <LinkButton onClick={() => setBill(v.receiptId)} title="Open the bill">
              {v.invoiceNo}
            </LinkButton>
          </span>
        ),
      },
      { key: "mode", label: "Payment mode", sort: (v) => v.mode, render: (v) => v.mode },
      {
        key: "disc",
        label: "Discount",
        align: "right",
        sort: (v) => v.discountPct,
        render: (v) => (v.discountPct ? <span style={{ fontWeight: 700, color: v.discountPct >= 15 ? C.amber : C.ink }}>{v.discountPct}%</span> : <span style={{ color: "#94A3B8" }}>—</span>),
      },
      { key: "amount", label: "Amount", align: "right", sort: (v) => v.amount, render: (v) => <span style={{ fontWeight: 600 }}>{inr(v.amount)}</span> },
    ],
    []
  );

  if (sq.status === "denied" || dq.status === "denied") return <NoPermissionState role={user.role} required="Owner, Accounts or the centre's Admin / Manager" />;

  const exportExcel = () => {
    if (!detail) return;
    exportXlsx(
      fileName(["vehicle", detail.plate.replace(/\s/g, "-"), ledger.today], "xlsx"),
      {
        title: "Vehicle visits",
        subtitle: `Dev Ventures · ${detail.plate} · ${detail.makeModel ?? "Details pending"} · ${detail.owner}`,
        columns: [
          { label: "Date" },
          { label: "Time" },
          { label: "Centre" },
          { label: "Car number", kind: "plate" },
          { label: "Job card" },
          { label: "Invoice" },
          { label: "Payment mode" },
          { label: "Discount", kind: "pct", align: "right" },
          { label: "Amount", kind: "money", align: "right" },
        ],
        rows: detail.history.map((v) => [fmtDate(v.date), v.time, v.centreName, `${detail.plate}\n${detail.makeModel ?? "Details pending"}`, v.jobCard, v.invoiceNo, v.mode, v.discountPct, v.amount]),
        totals: ["Total", null, null, null, null, null, null, null, detail.totalSpent],
      },
      "Visits"
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <PageTitle title="Vehicle search" sub="Find a car by number or phone and see every visit, bill and payment." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(input);
        }}
        style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}
      >
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Car number or phone, e.g. TN09AB1234"
          aria-label="Car number or phone"
          autoFocus
          style={{ flex: "1 1 320px", maxWidth: "460px", height: "42px", borderRadius: "999px", border: "1.5px solid #CBD5E1", padding: "0 18px", fontSize: "14px", background: "#FFFFFF", color: C.ink, outline: "none" }}
        />
        <PrimaryButton type="submit">Search</PrimaryButton>
        <span style={{ fontSize: "12.5px", color: C.muted }}>Spaces and capital letters don&apos;t matter.</span>
      </form>

      {!submitted && <EmptyState message="Type a car number or phone number above to see its history." />}

      {submitted && sq.status === "loading" && <LoadingPlaceholderRows rows={4} />}
      {submitted && sq.status === "error" && <ErrorRetryState message={sq.message} onRetry={reloadSearch} />}

      {submitted && sq.status === "ready" && matches.length === 0 && <EmptyState message={`No vehicle found for "${submitted}". Check the number and try again.`} />}

      {/* several cars: pick one */}
      {submitted && matches.length > 1 && !picked && (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.line}`, fontSize: "13.5px", color: C.muted }}>
            {matches.length} vehicles match. Pick one to see its visits.
          </div>
          <div>
            {matches.map((m: VehicleSummary) => (
              <button
                key={m.plate}
                type="button"
                onClick={() => setPicked(m.plate)}
                className="sg-acct-row"
                style={{ display: "flex", width: "100%", alignItems: "center", gap: "20px", padding: "12px 18px", border: "none", borderBottom: "1px solid #EDF2F7", background: "transparent", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
              >
                <span style={{ minWidth: "190px" }}>
                  <CarPlate plate={m.plate} makeModel={m.makeModel} compact />
                </span>
                <span style={{ flex: 1, fontSize: "13px", color: C.ink }}>
                  {m.owner}
                  <br />
                  <span style={{ color: C.muted, fontSize: "12px" }}>{m.phoneMasked}</span>
                </span>
                <span style={{ fontSize: "12.5px", color: C.muted, textAlign: "right" }}>
                  {m.visits} visit{m.visits === 1 ? "" : "s"}
                  <br />
                  Last: {fmtDate(m.lastDate)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {plate && dq.status === "loading" && <LoadingPlaceholderRows rows={5} />}
      {plate && dq.status === "error" && <ErrorRetryState message={dq.message} onRetry={reloadDetail} />}

      {detail && (
        <>
          {/* vehicle header */}
          <div style={{ ...cardStyle, padding: "18px 22px", display: "flex", gap: "28px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ transform: "scale(1.15)", transformOrigin: "left center", marginRight: "10px" }}>
              <CarPlate plate={detail.plate} makeModel={detail.makeModel} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: C.muted }}>Owner</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: C.navy }}>{detail.owner}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: C.muted }}>Phone</div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: C.ink }}>{detail.phoneMasked}</div>
            </div>
            {detail.otherVehicles.length > 0 && (
              <div>
                <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>Other vehicles on this phone</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {detail.otherVehicles.map((o) => (
                    <button
                      key={o.plate}
                      type="button"
                      onClick={() => setPicked(o.plate)}
                      title="Open this vehicle"
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    >
                      <CarPlate plate={o.plate} makeModel={o.makeModel} compact />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {matches.length > 1 && (
              <div style={{ marginLeft: "auto" }}>
                <OutlineButton small onClick={() => setPicked(null)}>
                  Back to {matches.length} matches
                </OutlineButton>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
            <SummaryCard label="Visits" value={detail.visits} />
            <SummaryCard label="Total billed" value={inr(detail.totalSpent)} />
            <SummaryCard label="Last visit" value={fmtDate(detail.lastDate)}>
              <span style={{ color: C.muted }}>{detail.lastCentre}</span>
            </SummaryCard>
          </div>

          <DataTable
            rows={detail.history}
            columns={columns}
            rowKey={(v) => v.receiptId}
            filterText={(v) => `${v.invoiceNo} ${v.jobCard} ${v.centreName} ${v.mode}`}
            onRowClick={(v) => setBill(v.receiptId)}
            rowLabel={(v) => `Open bill ${v.invoiceNo}`}
            defaultSort={{ key: "when", dir: "desc" }}
            empty="No visits to show."
            toolbar={
              <OutlineButton small onClick={exportExcel}>
                Export
              </OutlineButton>
            }
          />

          {detail.canSeePhotos ? (
            <div style={{ ...cardStyle, padding: "16px 20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: C.navy, marginBottom: "6px" }}>Photos from the last visit</div>
              <div style={{ fontSize: "13px", color: C.muted }}>Plate and four-side condition photos show here once the tablets upload them.</div>
            </div>
          ) : (
            <div style={{ fontSize: "12.5px", color: C.muted }}>
              Accounts can see visits and bills here, but not photos.
            </div>
          )}
        </>
      )}

      {bill && <BillDrawer user={user} receiptId={bill} onClose={() => setBill(null)} />}
    </div>
  );
}
