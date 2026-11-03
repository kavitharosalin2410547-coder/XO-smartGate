"use client";

import { Fragment, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { IconLock } from "@/components/icons";
import { logAction, savePermissions } from "@/lib/db";
import { ADMIN_ONLY, PERMISSIONS, ROLES, type Role } from "@/lib/permissions";

export default function RolesTab() {
  const { perms, refresh } = useAuth();
  const [saving, setSaving] = useState(false);

  const modules: string[] = [];
  for (const p of PERMISSIONS) if (!modules.includes(p.module)) modules.push(p.module);

  async function toggle(role: Role, key: string, label: string, on: boolean) {
    setSaving(true);
    const next = { ...perms, [role]: on ? [...perms[role], key] : perms[role].filter((k) => k !== key) };
    await savePermissions(next);
    await logAction("permissions.changed", `${role}: ${label} ${on ? "allowed" : "removed"}`);
    await refresh();
    setSaving(false);
  }

  return (
    <>
      <p className="muted">
        Choose what each role can do. Changes apply the next time that person opens a page. The Admin role always has full access.
      </p>

      <section className="card flush">
        <div className="table-wrap">
          <table className="tbl matrix">
            <thead>
              <tr>
                <th>Permission</th>
                {ROLES.map((r) => (
                  <th key={r.id} className="center" title={r.blurb}>
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <Fragment key={m}>
                  <tr className="group">
                    <td colSpan={ROLES.length + 1}>{m}</td>
                  </tr>
                  {PERMISSIONS.filter((p) => p.module === m).map((p) => (
                    <tr key={p.key}>
                      <td data-label="Permission">{p.label}</td>
                      {ROLES.map((r) => {
                        const locked = r.id === "admin" || ADMIN_ONLY.has(p.key);
                        const checked = r.id === "admin" ? true : perms[r.id].includes(p.key);
                        return (
                          <td key={r.id} data-label={r.label} className="center">
                            {locked ? (
                              <span className={`lock${checked ? " on" : ""}`} title={r.id === "admin" ? "Admin always has full access" : "Admin only"}>
                                {checked ? <input type="checkbox" checked readOnly disabled aria-label={`${r.label}: ${p.label}`} /> : <IconLock size={16} />}
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={saving}
                                aria-label={`${r.label}: ${p.label}`}
                                onChange={(e) => toggle(r.id, p.key, p.label, e.target.checked)}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="role-cards">
        {ROLES.map((r) => (
          <div key={r.id} className="card role-card">
            <strong>{r.label}</strong>
            <p className="muted">{r.blurb}</p>
          </div>
        ))}
      </section>
    </>
  );
}
