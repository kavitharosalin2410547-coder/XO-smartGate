"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { PaidBadge } from "./ui";
import { markPaid, markUnpaid, type Job, type PayMethod } from "@/lib/db";
import { money } from "@/lib/services";

// Shows payment status for a job and, for roles that may collect money,
// lets them record the payment method and mark it paid.
export default function PayControl({ job, onChange, compact = false }: { job: Job; onChange: () => void; compact?: boolean }) {
  const { can } = useAuth();
  const [method, setMethod] = useState<PayMethod>("cash");
  const [busy, setBusy] = useState(false);

  if (job.paid) {
    return (
      <span className="row" style={{ gap: 8 }}>
        <PaidBadge paid method={job.method} />
        {can("payments.collect") && !compact && (
          <button
            className="btn ghost sm"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm("Mark this payment as not received?")) return;
              setBusy(true);
              await markUnpaid(job.id);
              setBusy(false);
              onChange();
            }}
          >
            Undo
          </button>
        )}
      </span>
    );
  }

  if (job.status !== "done") return <span className="muted">After wash</span>;
  if (!can("payments.collect")) return <PaidBadge paid={false} />;

  return (
    <span className="pay">
      <select className="select sm" aria-label="Payment method" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
        <option value="cash">Cash</option>
        <option value="upi">UPI</option>
        <option value="card">Card</option>
      </select>
      <button
        className="btn primary sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await markPaid(job.id, method);
          setBusy(false);
          onChange();
        }}
      >
        Collect {money(job.price)}
      </button>
    </span>
  );
}
