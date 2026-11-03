"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { IconCar, IconChart, IconDrop, IconHome, IconLogout, IconShield } from "./icons";
import { ROLE_LABEL } from "@/lib/permissions";

const NAV = [
  { href: "/", label: "Home", short: "Home", icon: IconHome, perm: "home.view" },
  { href: "/revenue/", label: "Revenue", short: "Revenue", icon: IconChart, perm: "revenue.view" },
  { href: "/customers/", label: "Customers & Vehicles", short: "Customers", icon: IconCar, perm: "customers.view" },
  { href: "/admin/", label: "Admin", short: "Admin", icon: IconShield, perm: "admin.manage" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const upd = () => setOnline(navigator.onLine);
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    return () => {
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
    };
  }, []);
  return online;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, business, can, signOut } = useAuth();
  const path = usePathname() || "/";
  const online = useOnline();
  const items = NAV.filter((n) => can(n.perm));
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.replace(/\/$/, "")));

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <IconDrop size={20} />
          </span>
          <span>
            <span className="brand-name">{business}</span>
            <span className="brand-sub">Car wash manager</span>
          </span>
        </div>

        <nav className="nav" aria-label="Main">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-item${isActive(n.href) ? " active" : ""}`} aria-current={isActive(n.href) ? "page" : undefined}>
              <n.icon size={20} />
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className={`conn${online ? "" : " off"}`}>
            <span className="dot" />
            {online ? "Online" : "Offline: saved on this device"}
          </div>
          <div className="user-card">
            <span className="avatar">{initials(user.name)}</span>
            <span className="user-meta">
              <strong>{user.name}</strong>
              <small>{ROLE_LABEL[user.role]}</small>
            </span>
            <button className="icon-btn" onClick={signOut} aria-label="Log out" title="Log out">
              <IconLogout size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="m-header">
          <span className="brand">
            <span className="brand-mark">
              <IconDrop size={18} />
            </span>
            <span className="brand-name">{business}</span>
          </span>
          <span className="row" style={{ gap: 6 }}>
            {!online && <span className="badge s-pending">Offline</span>}
            <button className="icon-btn" onClick={signOut} aria-label="Log out">
              <IconLogout size={18} />
            </button>
          </span>
        </header>

        <div className="page">{children}</div>
      </div>

      <nav className="tabbar" aria-label="Main">
        {items.map((n) => (
          <Link key={n.href} href={n.href} className={isActive(n.href) ? "active" : ""} aria-current={isActive(n.href) ? "page" : undefined}>
            <n.icon size={22} />
            {n.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
