"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import CarForm from "@/components/CarForm";
import PayControl from "@/components/PayControl";
import RequirePerm from "@/components/RequirePerm";
import { IconBack } from "@/components/icons";
import { Plate, StatusBadge } from "@/components/ui";
import { addJob, deleteCar, deleteJob, getCar, listJobsForCar, setJobStatus, updateCar, type Car, type Job } from "@/lib/db";
import { formatPlate } from "@/lib/plate";
import { money, SERVICE_PRESETS } from "@/lib/services";

function VehicleDetail() {
  const router = useRouter();
  const { can } = useAuth();
  const id = useSearchParams().get("id") || "";
  const [car, setCar] = useState<Car | null | undefined>(undefined);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editing, setEditing] = useState(false);

  const [type, setType] = useState(SERVICE_PRESETS[0].name);
  const [price, setPrice] = useState(SERVICE_PRESETS[0].price);
  const [jobNotes, setJobNotes] = useState("");
  const showMoney = can("revenue.view") || can("payments.collect") || can("jobs.create");

  const load = useCallback(async () => {
    const c = await getCar(id);
    setCar(c ?? null);
    if (c) setJobs(await listJobsForCar(id));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (car === undefined) return null;
  if (car === null)
    return (
      <div className="card empty-state">
        <h2>Vehicle not found</h2>
        <Link className="btn secondary" href="/customers/">
          Back to Customers &amp; Vehicles
        </Link>
      </div>
    );

  const done = jobs.filter((j) => j.status === "done");
  const spent = done.reduce((s, j) => s + j.price, 0);
  const owing = done.filter((j) => !j.paid).reduce((s, j) => s + j.price, 0);

  async function createJob(e: React.FormEvent) {
    e.preventDefault();
    await addJob({ carId: id, type, price: Number(price) || 0, notes: jobNotes.trim() });
    setJobNotes("");
    void load();
  }

  async function remove() {
    if (!car) return;
    if (!window.confirm(`Delete ${formatPlate(car.plate)} and all its wash history? This cannot be undone.`)) return;
    await deleteCar(id);
    router.replace("/customers/");
  }

  return (
    <>
      <Link className="back" href="/customers/">
        <IconBack size={16} /> Customers &amp; Vehicles
      </Link>

      {editing ? (
        <div className="narrow">
          <h1 className="page-title mb">Edit vehicle</h1>
          <CarForm
            initial={car}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={async (data) => {
              await updateCar(id, data);
              setEditing(false);
              void load();
            }}
          />
        </div>
      ) : (
        <section className="card vehicle-head">
          <div className="vh-main">
            <Plate plate={car.plate} size="lg" />
            <p className="vh-model">{[car.make, car.model, car.color].filter(Boolean).join(" · ") || "No vehicle details"}</p>
            <p className="muted">
              {car.ownerName || "No owner name"}
              {car.phone && (
                <>
                  {" · "}
                  <a href={`tel:${car.phone.replace(/\s/g, "")}`}>{car.phone}</a>
                </>
              )}
            </p>
            {car.notes && <p className="note">{car.notes}</p>}
          </div>
          <div className="vh-stats">
            <div>
              <span className="kpi-label">Visits</span>
              <strong>{jobs.length}</strong>
            </div>
            {showMoney && (
              <>
                <div>
                  <span className="kpi-label">Total spent</span>
                  <strong>{money(spent)}</strong>
                </div>
                <div>
                  <span className="kpi-label">Owes</span>
                  <strong>{money(owing)}</strong>
                </div>
              </>
            )}
          </div>
          {(can("customers.edit") || can("customers.delete")) && (
            <div className="vh-actions">
              {can("customers.edit") && (
                <button className="btn" onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
              {can("customers.delete") && (
                <button className="btn danger" onClick={remove}>
                  Delete
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {!editing && can("jobs.create") && (
        <section className="card">
          <h2 className="card-title">New wash job</h2>
          <form className="job-form" onSubmit={createJob}>
            <div className="field">
              <label htmlFor="type">Service</label>
              <select
                id="type"
                className="select"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  const p = SERVICE_PRESETS.find((s) => s.name === e.target.value);
                  if (p) setPrice(p.price);
                }}
              >
                {SERVICE_PRESETS.map((s) => (
                  <option key={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="price">Price (₹)</label>
              <input id="price" className="input" type="number" min={0} inputMode="numeric" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
            <div className="field grow">
              <label htmlFor="jnotes">Notes (optional)</label>
              <input id="jnotes" className="input" value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} placeholder="Interior very dusty" />
            </div>
            <button className="btn primary" type="submit">
              Add to queue
            </button>
          </form>
        </section>
      )}

      <section className="card flush">
        <div className="card-head pad">
          <h2 className="card-title">Wash history</h2>
          <span className="muted">{jobs.length} job{jobs.length === 1 ? "" : "s"}</span>
        </div>
        {jobs.length === 0 ? (
          <p className="muted pad">No services yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Status</th>
                  {showMoney && <th className="num">Price</th>}
                  {showMoney && <th>Payment</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td data-label="Service">
                      <span>
                        <strong>{j.type}</strong>
                        {j.notes && <small className="sub">{j.notes}</small>}
                      </span>
                    </td>
                    <td data-label="Date" className="muted">
                      {new Date(j.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={j.status} />
                    </td>
                    {showMoney && (
                      <td data-label="Price" className="num">
                        {money(j.price)}
                      </td>
                    )}
                    {showMoney && (
                      <td data-label="Payment">
                        <PayControl job={j} onChange={load} />
                      </td>
                    )}
                    <td className="act">
                      <span className="row end">
                        {j.status === "pending" && can("jobs.update") && (
                          <button className="btn primary sm" onClick={() => setJobStatus(j.id, "in_progress").then(load)}>
                            Start wash
                          </button>
                        )}
                        {j.status === "in_progress" && can("jobs.update") && (
                          <button className="btn primary sm" onClick={() => setJobStatus(j.id, "done").then(load)}>
                            Mark done
                          </button>
                        )}
                        {can("jobs.delete") && (
                          <button className="btn ghost sm danger-text" onClick={() => window.confirm("Delete this job?") && deleteJob(j.id).then(load)}>
                            Delete
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default function VehiclePage() {
  return (
    <RequirePerm perm="customers.view">
      <Suspense fallback={null}>
        <VehicleDetail />
      </Suspense>
    </RequirePerm>
  );
}
