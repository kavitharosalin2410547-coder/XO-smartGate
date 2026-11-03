"use client";

import React from "react";
import { fmtDate, inr, type AcctUser, type ReceiptStatus } from "@/lib/accounts";
import { ledger } from "@/lib/accounts-app";
import CarPlate from "../CarPlate";
import { Drawer, Pill, useQuery, C, type Tone } from "./kit";
import { ErrorRetryState, LoadingPlaceholderRows, NoPermissionState } from "../StateHandlers";

export const STATUS_TONE: Record<ReceiptStatus, Tone> = {
  Matched: "green",
  "Not in cash count": "orange",
  "Not settled": "red",
  "Late sync": "purple",
};

/** Bills show two decimals (spec 3.5). */
const rupees2 = (n: number) => inr(Math.trunc(n)) + "." + (Math.abs(n) % 1).toFixed(2).slice(2);

export default function BillDrawer({ user, receiptId, onClose }: { user: AcctUser; receiptId: string; onClose: () => void }) {
  const [q, reload] = useQuery(() => ledger.getBill(user, receiptId), [receiptId, user.role, user.centreId]);

  return (
    <Drawer title={`Bill · ${receiptId}`} onClose={onClose}>
      {q.status === "loading" && <LoadingPlaceholderRows rows={5} />}
      {q.status === "denied" && <NoPermissionState role={user.role} required="Accounts, Owner or the centre's Admin / Manager" />}
      {q.status === "error" && <ErrorRetryState message={q.message} onRetry={reload} />}
      {q.status === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", fontSize: "13px", color: C.ink }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", color: C.muted }}>Tax invoice</div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: C.navy }}>{q.data.invoiceNo}</div>
              <div style={{ color: C.muted, marginTop: "2px" }}>
                {fmtDate(q.data.date)} · {q.data.time} · {q.data.centreName}
              </div>
            </div>
            <Pill tone={STATUS_TONE[q.data.status]}>{q.data.status}</Pill>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "12px 14px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: `1px solid ${C.line}` }}>
            <div>
              <div style={{ fontSize: "12px", color: C.muted, marginBottom: "3px" }}>Customer</div>
              <div style={{ fontWeight: 700, color: C.navy }}>{q.data.customer}</div>
            </div>
            <CarPlate plate={q.data.plate} makeModel={q.data.makeModel} />
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: C.muted, fontSize: "12px", textAlign: "right" }}>
                <th style={{ textAlign: "left", fontWeight: 600, padding: "6px 0" }}>Item</th>
                <th style={{ fontWeight: 600, padding: "6px 0" }}>Qty</th>
                <th style={{ fontWeight: 600, padding: "6px 0" }}>Rate</th>
                <th style={{ fontWeight: 600, padding: "6px 0" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {q.data.lines.map((l) => (
                <tr key={l.desc} style={{ borderTop: "1px solid #EDF2F7", textAlign: "right" }}>
                  <td style={{ textAlign: "left", padding: "8px 8px 8px 0" }}>{l.desc}</td>
                  <td>{l.qty}</td>
                  <td>{rupees2(l.rate)}</td>
                  <td style={{ fontWeight: 600 }}>{rupees2(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: `1px solid ${C.line}`, paddingTop: "12px" }}>
            <Row label="Subtotal" value={rupees2(q.data.subtotal)} />
            {q.data.discountPct > 0 && (
              <Row
                label={`Discount ${q.data.discountPct}% · given by ${q.data.discountBy} (${q.data.discountRole})`}
                value={`-${rupees2(q.data.discountValue)}`}
                tone={C.amber}
              />
            )}
            <Row label="Taxable value" value={rupees2(q.data.taxable)} />
            <Row label={`GST ${q.data.gstPct}%`} value={rupees2(q.data.gst)} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 700, color: C.navy, borderTop: `1px solid ${C.line}`, paddingTop: "10px", marginTop: "4px" }}>
              <span>Total</span>
              <span>{rupees2(q.data.total)}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", padding: "12px 14px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: `1px solid ${C.line}` }}>
            <Meta label="Paid by" value={q.data.mode} />
            <Meta label={q.data.mode === "Pine Labs" ? "Pine Labs reference" : "Receipt"} value={q.data.pineRef ?? q.data.receiptId} />
            <Meta label="Gate pass" value={q.data.passNo} />
            <Meta label="Left the gate" value={q.data.gateTime} />
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", color: tone ?? "inherit" }}>
      <span style={{ color: tone ?? C.muted }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "11.5px", color: C.muted }}>{label}</div>
      <div style={{ fontWeight: 700, color: C.navy }}>{value}</div>
    </div>
  );
}
