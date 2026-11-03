"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { IconUserPlus } from "@/components/icons";
import { createUser, resetPassword, updateUser } from "@/lib/auth";
import { listUsers, type User } from "@/lib/db";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/permissions";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function UsersTab() {
  const { user: me, refresh } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "washer" as Role });
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => setUsers(await listUsers()), []);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<void>, ok?: string) {
    setError("");
    setNote("");
    try {
      await fn();
      if (ok) setNote(ok);
      await load();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      await createUser(form);
      setForm({ name: "", username: "", password: "", role: "washer" });
      setAdding(false);
    }, "User added. Share the username and temporary password with them.");
  }

  return (
    <>
      <div className="card-head">
        <p className="muted">Everyone who can sign in on this device.</p>
        <button className="btn primary" onClick={() => setAdding((a) => !a)}>
          <IconUserPlus size={18} /> {adding ? "Close" : "Add user"}
        </button>
      </div>

      {adding && (
        <form className="card add-user" onSubmit={add}>
          <div className="field">
            <label htmlFor="u-name">Full name</label>
            <input id="u-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="u-user">Username</label>
            <input id="u-user" className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoCapitalize="none" required />
          </div>
          <div className="field">
            <label htmlFor="u-role">Role</label>
            <select id="u-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="u-pass">Temporary password</label>
            <input id="u-pass" className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
          </div>
          <button className="btn primary" type="submit">
            Create user
          </button>
        </form>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {note && <p className="notice">{note}</p>}

      <section className="card flush">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <>
                  <tr key={u.username}>
                    <td data-label="User">
                      <span className="person">
                        <span className="avatar sm">{initials(u.name)}</span>
                        <span>
                          <strong>{u.name}</strong>
                          {u.username === me.username && <span className="badge s-you">You</span>}
                          <small className="sub">@{u.username}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Role">
                      <select
                        className="select sm"
                        value={u.role}
                        aria-label={`Role for ${u.name}`}
                        onChange={(e) => run(() => updateUser(u.username, { role: e.target.value as Role }), `${u.name} is now ${ROLE_LABEL[e.target.value as Role]}.`)}
                      >
                        {ROLES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${u.active ? "s-done" : "s-off"}`}>{u.active ? "Active" : "Disabled"}</span>
                    </td>
                    <td data-label="Added" className="muted">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="act">
                      <span className="row end">
                        <button className="btn ghost sm" onClick={() => (setResetFor(resetFor === u.username ? null : u.username), setNewPw(""))}>
                          Reset password
                        </button>
                        <button
                          className="btn ghost sm"
                          disabled={u.username === me.username}
                          title={u.username === me.username ? "You cannot disable your own account" : undefined}
                          onClick={() => run(() => updateUser(u.username, { active: !u.active }), `${u.name} ${u.active ? "disabled" : "enabled"}.`)}
                        >
                          {u.active ? "Disable" : "Enable"}
                        </button>
                      </span>
                    </td>
                  </tr>
                  {resetFor === u.username && (
                    <tr key={u.username + "-reset"} className="inline-row">
                      <td colSpan={5}>
                        <form
                          className="row"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void run(async () => {
                              await resetPassword(u.username, newPw);
                              setResetFor(null);
                              setNewPw("");
                            }, `Password changed for ${u.name}.`);
                          }}
                        >
                          <input className="input" style={{ maxWidth: 280 }} type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password (6+ characters)" minLength={6} required autoFocus />
                          <button className="btn primary sm" type="submit">
                            Save password
                          </button>
                          <button className="btn ghost sm" type="button" onClick={() => setResetFor(null)}>
                            Cancel
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
