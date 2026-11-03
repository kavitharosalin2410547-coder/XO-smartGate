"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { currentUsername, hasAnyUser, login, register } from "@/lib/auth";
import { IconCamera, IconCheck, IconDrop, IconShield } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"checking" | "login" | "setup">("checking");
  const [business, setBusiness] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (currentUsername()) {
      router.replace("/");
      return;
    }
    hasAnyUser()
      .then((has) => setMode(has ? "login" : "setup"))
      .catch(() => setMode("login"));
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "setup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "setup") await register({ business, name, username, password });
      else await login(username, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (mode === "checking") return <div className="splash">Loading…</div>;
  const setup = mode === "setup";

  return (
    <main className="auth">
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <div className="brand">
            <span className="brand-mark">
              <IconDrop size={20} />
            </span>
            <span className="brand-name">Garage Desk</span>
          </div>

          <h1 className="auth-title">{setup ? "Set up your car wash" : "Welcome back"}</h1>
          <p className="muted">
            {setup
              ? "First time on this device. Create the admin account. It is stored only here and works with no internet."
              : "Sign in to manage today's washes. Works offline."}
          </p>

          {setup && (
            <>
              <div className="field">
                <label htmlFor="biz">Business name</label>
                <input id="biz" className="input" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Blue Wave Car Wash" required />
              </div>
              <div className="field">
                <label htmlFor="name">Your name</label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="user">Username</label>
            <input id="user" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
          </div>
          <div className="field">
            <label htmlFor="pass">Password</label>
            <input id="pass" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={setup ? "new-password" : "current-password"} required />
          </div>
          {setup && (
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            </div>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button className="btn primary block lg" type="submit" disabled={busy}>
            {busy ? "Please wait…" : setup ? "Create account" : "Log in"}
          </button>
        </form>
      </section>

      <aside className="auth-aside" aria-hidden="true">
        <div className="aside-inner">
          <h2>Every wash, tracked.</h2>
          <p>From the first scan of a number plate to the final payment.</p>
          <ul>
            <li>
              <IconCheck size={18} /> Works fully offline
            </li>
            <li>
              <IconCamera size={18} /> Scan number plates with the camera
            </li>
            <li>
              <IconShield size={18} /> Roles and permissions for your team
            </li>
          </ul>
        </div>
      </aside>
    </main>
  );
}
