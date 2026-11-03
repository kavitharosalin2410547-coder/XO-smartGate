"use client";

import { useEffect, useState } from "react";
import { IconSearch } from "@/components/icons";
import { listAudit, type AuditEntry } from "@/lib/db";

const LABEL: Record<string, string> = {
  login: "Signed in",
  logout: "Signed out",
  "account.created": "Business set up",
  "vehicle.added": "Vehicle added",
  "vehicle.edited": "Vehicle edited",
  "vehicle.deleted": "Vehicle deleted",
  "job.created": "Job created",
  "job.status": "Job progress",
  "job.deleted": "Job deleted",
  "payment.collected": "Payment collected",
  "payment.reversed": "Payment reversed",
  "user.created": "User added",
  "user.role": "Role changed",
  "user.enabled": "User enabled",
  "user.disabled": "User disabled",
  "user.password": "Password reset",
  "permissions.changed": "Permission changed",
  "backup.exported": "Backup downloaded",
  "backup.restored": "Backup restored",
  "revenue.exported": "Revenue exported",
};

export default function ActivityTab() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    listAudit(300).then(setRows);
  }, []);

  const term = q.trim().toLowerCase();
  const shown = term ? rows.filter((r) => `${r.user} ${LABEL[r.action] ?? r.action} ${r.detail}`.toLowerCase().includes(term)) : rows;

  return (
    <>
      <div className="card-head">
        <p className="muted">Who did what, and when. The latest {rows.length} actions.</p>
        <div className="search" style={{ maxWidth: 280 }}>
          <IconSearch size={18} />
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity" aria-label="Search activity" />
        </div>
      </div>

      <section className="card flush">
        {shown.length === 0 ? (
          <p className="muted pad">No activity yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td data-label="When" className="muted nowrap">
                      {new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td data-label="User">@{r.user}</td>
                    <td data-label="Action">
                      <span className="badge s-pending">{LABEL[r.action] ?? r.action}</span>
                    </td>
                    <td data-label="Details">{r.detail}</td>
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
