"use client";

import { useEffect } from "react";

// Registers the service worker (production builds only) and remembers the
// browser's "install" prompt so the Settings page can offer an Install button.
export default function PwaRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__installPrompt = e;
      window.dispatchEvent(new Event("pwa-installable"));
    };
    const onInstalled = () => {
      (window as any).__installPrompt = null;
      window.dispatchEvent(new Event("pwa-installable"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      // When a new version takes over, reload once so the open page is not left on the old one.
      const had = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (had && !reloaded) {
          reloaded = true;
          window.location.reload();
        }
      });
      navigator.serviceWorker.register("/sw.js").catch((err) => console.error("SW registration failed", err));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}
