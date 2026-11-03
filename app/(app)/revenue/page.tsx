"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import RequirePerm from "@/components/RequirePerm";
import PayControl from "@/components/PayControl";
import { BarChart, Breakdown } from "@/components/charts";
import { IconDownload } from "@/components/icons";
import { Delta, METHOD_LABEL, PageHead, Plate, Segmented } from "@/components/ui";
import { listAllJobs, listCars, logAction, type Car, type Job } from "@/lib/db";
import { formatPlate } from "@/lib/plate";
import { money } from "@/lib/services";
import {
  RANGE_LABEL,
  ago,
  breakdown,
  collectedJobs,
  collectedTotal,
  completedCount,
  outstanding,
  pctChange,
  previousBounds,
  rangeBounds,
  series,
  type Range,
} from "@/lib/stats";

const RANGES: Range[] = ["today", "7d", "30d", "90d"];
const PREV_LABEL: Record<Range, string> = { today: "yesterday", "7d": "previous 7 days", "30d": "previous 30 days", "90d": "previous 90 days" };

export default function RevenuePage() {
  return (
    <RequirePerm perm="revenue.view">
      <Revenue />
    </RequirePerm>
  );
}

function Revenue() {
  const { can } = useAuth();
  const [range, setRange] = useState<Range>("7d");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [j, c] = await Promise.all([listAllJobs(), listCars()]);
    setJobs(j);
    setCars(c);
    setNow(Date.now());
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const carById = useMemo(() => new Map(cars.map((c) => [c.id, c])), [cars]);
  const { start, end } = rangeBounds(range, now);
  const prev = previousBounds(range, now);

  const collected = collectedTotal(jobs, start, end);
  const previous = collectedTotal(jobs, prev.start, prev.end);
  const paidJobs = collectedJobs(jobs, start, end).sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0));
  const avg = paidJobs.length ? Math.round(collected / paidJobs.length) : 0;
  const finished = completedCount(jobs, start, end);
  const dues = outstanding(jobs);
  const bars = series(jobs, range, now);

  function exportCsv() {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [["Date", "Vehicle", "Service", "Method", "Amount"].join(",")];
    for (const j of paidJobs) {
      const car = carById.get(j.carId);
      rows.push(
        [
          esc(new Date(j.paidAt ?? 0).toLocaleString("en-IN")),
          esc(car ? formatPlate(car.plate) : "Unknown"),
          esc(j.type),
          esc(j.method ? METHOD_LABEL[j.method] : ""),
          j.price,
        ].join(","),
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `revenue-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    void logAction("revenue.exported", `${RANGE_LABEL[range]} · ${paidJobs.length} payments`);
  }

  return (
    <>
      <PageHead
        title="Revenue"
        sub="Money collected, by day, service and payment method."
        actions={
          <>
            <Segmented
              label="Time range"
              value={range}
              onChange={setRange}
              options={RANGES.map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
            />
            {can("revenue.export") && (
              <button className="btn" onClick={exportCsv} disabled={paidJobs.length === 0}>
                <IconDownload size={18} /> Export CSV
              </button>
            )}
          </>
        }
      />

      <section className="grid-kpi">
        <div className="kpi dark">
          <span className="kpi-label">Collected</span>
          <span className="kpi-value">{money(collected)}</span>
          <span className="kpi-sub">
            <Delta pct={pctChange(collected, previous)} /> vs {PREV_LABEL[range]}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Washes finished</span>
          <span className="kpi-value">{finished}</span>
          <span className="kpi-sub">{RANGE_LABEL[range].toLowerCase()}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Average ticket</span>
          <span className="kpi-value">{money(avg)}</span>
          <span className="kpi-sub">{paidJobs.length} payment{paidJobs.length === 1 ? "" : "s"}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Outstanding</span>
          <span className="kpi-value">{money(dues.total)}</span>
          <span className="kpi-sub">
            {dues.count} unpaid job{dues.count === 1 ? "" : "s"} (all time)
          </span>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Collected {range === "today" ? "by hour" : range === "90d" ? "by week" : "by day"}</h2>
          <span className="muted">{RANGE_LABEL[range]}</span>
        </div>
        <BarChart data={bars} ariaLabel={`Money collected, ${RANGE_LABEL[range]}`} />
      </section>

      <section className="grid-2">
        <div className="card">
          <h2 className="card-title">By service</h2>
          <Breakdown items={breakdown(jobs, start, end, "type")} kind="type" />
        </div>
        <div className="card">
          <h2 className="card-title">By payment method</h2>
          <Breakdown items={breakdown(jobs, start, end, "method")} kind="method" />
        </div>
      </section>

      {dues.count > 0 && (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Outstanding payments</h2>
            <span className="muted">{money(dues.total)} to collect</span>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Service</th>
                  <th>Finished</th>
                  <th className="num">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dues.list.map((j) => {
                  const car = carById.get(j.carId);
                  return (
                    <tr key={j.id}>
                      <td data-label="Vehicle">
                        {car ? (
                          <Link href={`/customers/view/?id=${car.id}`}>
                            <Plate plate={car.plate} size="sm" />
                          </Link>
                        ) : (
                          "Unknown"
                        )}
                      </td>
                      <td data-label="Service">{j.type}</td>
                      <td data-label="Finished" className="muted">
                        {ago(j.completedAt ?? j.createdAt, now)} ago
                      </td>
                      <td data-label="Amount" className="num">
                        <strong>{money(j.price)}</strong>
                      </td>
                      <td className="act">
                        <PayControl job={j} onChange={load} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Payments</h2>
          <span className="muted">{paidJobs.length} in {RANGE_LABEL[range].toLowerCase()}</span>
        </div>
        {paidJobs.length === 0 ? (
          <p className="muted">No payments collected in this period.</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Service</th>
                  <th>Method</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paidJobs.slice(0, 50).map((j) => {
                  const car = carById.get(j.carId);
                  return (
                    <tr key={j.id}>
                      <td data-label="Date" className="muted">
                        {new Date(j.paidAt ?? 0).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td data-label="Vehicle">{car ? <Plate plate={car.plate} size="sm" /> : "Unknown"}</td>
                      <td data-label="Service">{j.type}</td>
                      <td data-label="Method">{j.method ? METHOD_LABEL[j.method] : "-"}</td>
                      <td data-label="Amount" className="num">
                        <strong>{money(j.price)}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {paidJobs.length > 50 && <p className="muted foot-note">Showing the latest 50. Export CSV for the full list.</p>}
      </section>
    </>
  );
}
