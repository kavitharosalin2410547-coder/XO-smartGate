"use client";

import { compactNumber, type Slice } from "@/lib/stats";
import { CURRENCY, money } from "@/lib/services";
import { METHOD_LABEL } from "./ui";

/** Round a maximum up to a tidy axis value (1, 2, 2.5, 5 x 10^n). */
function niceMax(v: number) {
  if (v <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * pow) return m * pow;
  return 10 * pow;
}

export function BarChart({ data, height = 240, ariaLabel }: { data: { label: string; value: number }[]; height?: number; ariaLabel: string }) {
  const W = 680;
  const H = height;
  const pad = { l: 46, r: 8, t: 14, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const n = data.length;
  const slot = iw / n;
  const bw = Math.max(3, Math.min(22, slot * 0.62));
  const every = n <= 8 ? 1 : n <= 14 ? 2 : n <= 24 ? 3 : 5;
  const total = data.reduce((s, d) => s + d.value, 0);
  const peak = Math.max(...data.map((d) => d.value));

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = pad.t + ih - (ih * i) / 4;
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className="grid-line" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" className="axis">
              {i === 0 ? "0" : CURRENCY + compactNumber((max * i) / 4)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const h = (ih * d.value) / max;
        const x = pad.l + slot * i + (slot - bw) / 2;
        const isLast = i === n - 1;
        const isPeak = d.value === peak && peak > 0;
        return (
          <g key={i}>
            <rect
              x={x}
              y={pad.t + ih - Math.max(h, d.value > 0 ? 2 : 0)}
              width={bw}
              height={Math.max(h, d.value > 0 ? 2 : 0)}
              rx={Math.min(4, bw / 2)}
              className={`bar${isLast ? " last" : ""}${isPeak ? " peak" : ""}`}
            >
              <title>{`${d.label}: ${money(d.value)}`}</title>
            </rect>
            {i % every === 0 && (
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="axis">
                {d.label}
              </text>
            )}
          </g>
        );
      })}

      {total === 0 && (
        <text x={W / 2} y={pad.t + ih / 2} textAnchor="middle" className="axis empty">
          No payments collected in this period
        </text>
      )}
    </svg>
  );
}

const SHADES = ["var(--navy-900)", "var(--blue-600)", "var(--blue-500)", "var(--blue-400)", "var(--blue-300)"];

export function Breakdown({ items, kind }: { items: Slice[]; kind: "type" | "method" }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!items.length) return <p className="muted">Nothing collected in this period.</p>;
  return (
    <div className="stack">
      {items.map((it, i) => {
        const pct = total ? Math.round((it.value / total) * 100) : 0;
        return (
          <div key={it.label} className="bd-row">
            <div className="bd-top">
              <span>
                <strong>{kind === "method" ? METHOD_LABEL[it.label] ?? it.label : it.label}</strong>
                <span className="muted"> · {it.count} job{it.count === 1 ? "" : "s"}</span>
              </span>
              <span>
                <strong>{money(it.value)}</strong>
                <span className="muted"> {pct}%</span>
              </span>
            </div>
            <div className="bd-bar" aria-hidden>
              <span style={{ width: `${pct}%`, background: SHADES[Math.min(i, SHADES.length - 1)] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
