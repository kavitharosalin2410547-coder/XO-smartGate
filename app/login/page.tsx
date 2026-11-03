"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { currentUsername, hasAnyUser, login, register } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"checking" | "login" | "setup">("checking");
  const [business, setBusiness] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
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
    <main className="lg-page">
      <div className="lg-wrap">
        <div className="lg-brand">
          <span className="lg-mark">XO</span>
          <span className="lg-brand-text">
            <strong>XO SmartGate</strong>
            <small>Vehicle tracking &amp; billing</small>
          </span>
        </div>

        <form className="lg-card" onSubmit={submit}>
          <h1 className="lg-title">{setup ? "Create your account" : "Sign in"}</h1>
          <p className="lg-sub">
            {setup
              ? "First time on this device. This admin account is stored only here."
              : "Enter your username and password to continue."}
          </p>

          {setup && (
            <>
              <div className="lg-field">
                <label htmlFor="biz">Business name</label>
                <input id="biz" className="lg-input" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Blue Wave Car Wash" required />
              </div>
              <div className="lg-field">
                <label htmlFor="name">Your name</label>
                <input id="name" className="lg-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </div>
            </>
          )}

          <div className="lg-field">
            <label htmlFor="user">Username</label>
            <input id="user" className="lg-input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoFocus required />
          </div>

          <div className="lg-field">
            <label htmlFor="pass">Password</label>
            <div className="lg-pass">
              <input
                id="pass"
                className="lg-input"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={setup ? "new-password" : "current-password"}
                required
              />
              <button type="button" className="lg-eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {setup && (
            <div className="lg-field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" className="lg-input" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            </div>
          )}

          {error && (
            <p className="lg-error" role="alert">
              {error}
            </p>
          )}

          <button className="lg-btn" type="submit" disabled={busy}>
            {busy ? "Please wait…" : setup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="lg-foot">Works offline · Your data stays on this device</p>
      </div>
    </main>
  );
}
