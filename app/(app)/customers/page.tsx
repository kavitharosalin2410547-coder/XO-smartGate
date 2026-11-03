"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import RequirePerm from "@/components/RequirePerm";
import PlateScanner from "@/components/PlateScanner";
import { IconChevron, IconPlus, IconSearch } from "@/components/icons";
import { PageHead, Plate } from "@/components/ui";
import { listAllJobs, searchCars, type Car, type Job } from "@/lib/db";
import { cleanPlate, formatPlate } from "@/lib/plate";
import { money } from "@/lib/services";
import { carSummaries, startOfDay } from "@/lib/stats";

type Sort = "recent" | "visits" | "spend";

export default function CustomersPage() {
  return (
    <RequirePerm perm="customers.view">
      <Customers />
    </RequirePerm>
  );
}

function Customers() {
  const { can } = useAuth();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [cars, setCars] = useState<Car[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listAllJobs().then(setJobs);
  }, []);
  useEffect(() => {
    searchCars(query).then((c) => {
      setCars(c);
      setReady(true);
    });
  }, [query]);

  const summaries = useMemo(() => carSummaries(jobs), [jobs]);
  const showMoney = can("revenue.view") || can("payments.collect");

  const rows = useMemo(() => {
    const list = cars.map((c) => ({ car: c, s: summaries.get(c.id) ?? { visits: 0, spent: 0, lastVisit: null as number | null } }));
    if (sort === "visits") list.sort((a, b) => b.s.visits - a.s.visits || b.car.createdAt - a.car.createdAt);
    else if (sort === "spend") list.sort((a, b) => b.s.spent - a.s.spent || b.car.createdAt - a.car.createdAt);
    else list.sort((a, b) => (b.s.lastVisit ?? b.car.createdAt) - (a.s.lastVisit ?? a.car.createdAt));
    return list;
  }, [cars, summaries, sort]);

  const monthStart = new Date(startOfDay(Date.now()));
  monthStart.setDate(1);
  const allCount = summaries.size;
  const repeat = [...summaries.values()].filter((s) => s.visits >= 2).length;
  const newThisMonth = cars.filter((c) => c.createdAt >= monthStart.getTime()).length;
  const looksLikePlate = cleanPlate(query).length >= 6;

  return (
    <>
      <PageHead
        title="Customers & Vehicles"
        sub="Every vehicle you have washed, with its owner and history."
        actions={
          can("customers.create") && (
            <Link className="btn primary" href="/customers/new/">
              <IconPlus size={18} /> Add vehicle
            </Link>
          )
        }
      />

      <section className="grid-kpi three">
        <div className="kpi">
          <span className="kpi-label">Vehicles</span>
          <span className="kpi-value">{ready && !query ? cars.length : "-"}</span>
          <span className="kpi-sub">{allCount} with wash history</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Repeat customers</span>
          <span className="kpi-value">{repeat}</span>
          <span className="kpi-sub">2 or more visits</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">New this month</span>
          <span className="kpi-value">{ready && !query ? newThisMonth : "-"}</span>
          <span className="kpi-sub">vehicles added</span>
        </div>
      </section>

      <section className="card toolbar">
        <div className="search grow">
          <IconSearch size={18} />
          <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plate, owner, phone or model" aria-label="Search vehicles" />
        </div>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
          <option value="recent">Most recent</option>
          <option value="visits">Most visits</option>
          {showMoney && <option value="spend">Highest spend</option>}
        </select>
        <PlateScanner label="Scan plate" onPick={(p) => setQuery(formatPlate(p))} />
      </section>

      {ready && rows.length === 0 ? (
        <div className="card empty-state">
          <h2>{query ? "No vehicle matches that" : "No vehicles yet"}</h2>
          <p className="muted">{query ? "Check the spelling, or add it as a new vehicle." : "Add your first vehicle, or scan its number plate."}</p>
          {can("customers.create") && (
            <Link className="btn primary" href={looksLikePlate ? `/customers/new/?plate=${cleanPlate(query)}` : "/customers/new/"}>
              <IconPlus size={18} /> Add {looksLikePlate ? formatPlate(cleanPlate(query)) : "a vehicle"}
            </Link>
          )}
        </div>
      ) : (
        <section className="card flush">
          <div className="table-wrap">
            <table className="tbl hover">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Make &amp; model</th>
                  <th>Owner</th>
                  <th className="num">Visits</th>
                  {showMoney && <th className="num">Total spent</th>}
                  <th>Last visit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ car, s }) => (
                  <tr key={car.id}>
                    <td data-label="Vehicle">
                      <Link href={`/customers/view/?id=${car.id}`} className="row-link">
                        <Plate plate={car.plate} size="sm" />
                      </Link>
                    </td>
                    <td data-label="Model">
                      <span>
                        {[car.make, car.model].filter(Boolean).join(" ") || <span className="muted">-</span>}
                        {car.color && <span className="muted"> · {car.color}</span>}
                      </span>
                    </td>
                    <td data-label="Owner">
                      <span>
                        {car.ownerName || <span className="muted">-</span>}
                        {car.phone && <small className="sub">{car.phone}</small>}
                      </span>
                    </td>
                    <td data-label="Visits" className="num">
                      {s.visits}
                    </td>
                    {showMoney && (
                      <td data-label="Spent" className="num">
                        {money(s.spent)}
                      </td>
                    )}
                    <td data-label="Last visit" className="muted">
                      {s.lastVisit ? new Date(s.lastVisit).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No visits yet"}
                    </td>
                    <td className="act">
                      <Link href={`/customers/view/?id=${car.id}`} className="icon-btn" aria-label={`Open ${formatPlate(car.plate)}`}>
                        <IconChevron size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
