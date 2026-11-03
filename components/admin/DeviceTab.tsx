"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { IconDownload, IconUpload } from "@/components/icons";
import { logout } from "@/lib/auth";
import { exportAll, importAll, isBackup, setBusinessName, wipeAll } from "@/lib/db";

export default function DeviceTab() {
  const router = useRouter();
  const { business, refresh } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(business);
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState("checking…");
  const [persisted, setPersisted] = useState("checking…");
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const upd = () => setOnline(navigator.onLine);
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);

    const checkInstall = () => setCanInstall(!!(window as any).__installPrompt);
    checkInstall();
    window.addEventListener("pwa-installable", checkInstall);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);

    (async () => {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const names = await caches.keys();
        setOfflineReady(reg?.active && names.length ? `Yes (${names[0]})` : "Not yet. Open the app once while connected, then reload.");
      } else {
        setOfflineReady("Not supported in this browser");
      }
      if (navigator.storage?.persisted) setPersisted((await navigator.storage.persisted()) ? "Protected" : "Not protected");
      else setPersisted("Unknown");
    })();

    return () => {
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
      window.removeEventListener("pwa-installable", checkInstall);
    };
  }, []);

  async function install() {
    const p = (window as any).__installPrompt;
    if (!p) return;
    p.prompt();
    await p.userChoice;
    (window as any).__installPrompt = null;
    setCanInstall(false);
  }

  async function protect() {
    const ok = (await navigator.storage?.persist?.()) ?? false;
    setPersisted(ok ? "Protected" : "Browser declined (try installing the app first)");
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    await setBusinessName(name);
    await refresh();
    setMessage("Business name saved.");
  }

  async function backup() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `garage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage(`Backup saved: ${data.cars.length} vehicles, ${data.jobs.length} jobs.`);
  }

  async function restore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!isBackup(data)) throw new Error("This is not a Garage Desk backup file.");
      if (!window.confirm(`Replace everything on this device with the backup (${data.cars.length} vehicles, ${data.jobs.length} jobs)? Users and permissions in the backup will replace the current ones.`)) return;
      await importAll(data);
      await refresh();
      setMessage("Backup restored.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  async function wipe() {
    if (!window.confirm("Delete ALL vehicles, jobs, users and settings on this device? This cannot be undone.")) return;
    await wipeAll();
    logout();
    router.replace("/login/");
  }

  return (
    <div className="grid-2">
      <section className="card">
        <h2 className="card-title">Business</h2>
        <form className="stack" onSubmit={saveName}>
          <div className="field">
            <label htmlFor="biz">Business name</label>
            <input id="biz" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <button className="btn primary" type="submit">
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="card-title">Offline status</h2>
        <dl className="kv">
          <dt>Connection</dt>
          <dd>{online ? "Online" : "Offline"}</dd>
          <dt>Works offline</dt>
          <dd>{offlineReady}</dd>
          <dt>Data protection</dt>
          <dd>{persisted}</dd>
          <dt>Installed as app</dt>
          <dd>{installed ? "Yes" : "No"}</dd>
        </dl>
        <div className="row">
          {canInstall && (
            <button className="btn primary" onClick={install}>
              Install app
            </button>
          )}
          {persisted === "Not protected" && (
            <button className="btn" onClick={protect}>
              Protect my data
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Backup</h2>
        <p className="muted">All data lives only on this device. Save a backup file regularly, especially before clearing browser data.</p>
        <div className="row">
          <button className="btn primary" onClick={backup}>
            <IconDownload size={18} /> Download backup
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            <IconUpload size={18} /> Restore backup
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={restore} />
        </div>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="card danger-zone">
        <h2 className="card-title">Danger zone</h2>
        <p className="muted">Erase every vehicle, job, user and setting from this device.</p>
        <button className="btn danger" onClick={wipe}>
          Erase all data
        </button>
      </section>
    </div>
  );
}
