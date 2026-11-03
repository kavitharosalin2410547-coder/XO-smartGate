"use client";

import { formatPlate } from "@/lib/plate";
import { STATUS_LABEL, type JobStatus } from "@/lib/services";
import type { PayMethod } from "@/lib/db";

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </div>
  );
}

/** Number plate with the blue "IND" strip. */
export function Plate({ plate, size = "md" }: { plate: string; size?: "sm" | "md" | "lg" }) {
  return <span className={`plate ${size}`}>{formatPlate(plate)}</span>;
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return <span className={`badge s-${status}`}>{STATUS_LABEL[status]}</span>;
}

export const METHOD_LABEL: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", other: "Other" };

export function PaidBadge({ paid, method }: { paid: boolean; method?: PayMethod }) {
  return paid ? (
    <span className="badge s-paid">Paid{method ? ` · ${METHOD_LABEL[method]}` : ""}</span>
  ) : (
    <span className="badge s-unpaid">Unpaid</span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={o.value === value ? "on" : ""} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="delta up">▲ New</span>;
  if (pct === 0) return <span className="delta">No change</span>;
  return <span className={`delta ${pct > 0 ? "up" : "down"}`}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span>;
}
