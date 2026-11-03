"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSmartGate } from "./SmartGateContext";
import { cleanPlate, formatPlate } from "@/lib/plate";

// Icons (SVG inline for crisp rendering without external icon pack bloat)
function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}

function IconCentres() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconVehicles() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3c-.1.2-.1.4-.1.6v4.5c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconBlocklist() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function IconReports() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconAudit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconReconcile() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </svg>
  );
}

function IconDiscount() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function IconPurchase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}

// Navigation items matching Owner spec order (Section 3.2):
// Dashboard (W1) · Centres (W2, any centre) · Vehicles (W3) · Blocklist (W4) · Reports (W12) · Audit trail (W13) · Users (W9)
const OWNER_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", code: "W1", icon: IconDashboard },
  { href: "/centres/service-a", label: "Centres", code: "W2", icon: IconCentres },
  { href: "/vehicles", label: "Vehicles", code: "W3", icon: IconVehicles },
  { href: "/blocklist", label: "Blocklist", code: "W4", icon: IconBlocklist },
  { href: "/purchase", label: "Purchases", code: "W14", icon: IconPurchase },
  { href: "/reports", label: "Reports", code: "W12", icon: IconReports },
  { href: "/audit", label: "Audit trail", code: "W13", icon: IconAudit },
  { href: "/users", label: "Users", code: "W9", icon: IconUsers },
];

// Accounts menu (spec 3.2): Reconciliation (W5) · Discounts (W6) · Vehicles (W3) · Reports (W12)
const ACCOUNTS_NAV_ITEMS = [
  { href: "/reconciliation", label: "Reconciliation", code: "W5", icon: IconReconcile },
  { href: "/discounts", label: "Discounts", code: "W6", icon: IconDiscount },
  { href: "/vehicles", label: "Vehicles", code: "W3", icon: IconVehicles },
  { href: "/purchase", label: "Purchases", code: "W14", icon: IconPurchase },
  { href: "/reports", label: "Reports", code: "W12", icon: IconReports },
];

// Purchase menu: what the centre buys, and the cost report
const PURCHASE_NAV_ITEMS = [
  { href: "/purchase", label: "Purchases", code: "W14", icon: IconPurchase },
  { href: "/reports", label: "Reports", code: "W12", icon: IconReports },
];

export default function SmartGateShell({ children }: { children: React.ReactNode }) {
  const { user, alerts, dismissAlert, toast, isSaving, switchRole } = useSmartGate();
  const rawPath = usePathname() || "/";
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath;
  const router = useRouter();
  const isAccounts = user.role === "Accounts";
  const isPurchase = user.role === "Purchase";
  const NAV_ITEMS = isAccounts ? ACCOUNTS_NAV_ITEMS : isPurchase ? PURCHASE_NAV_ITEMS : OWNER_NAV_ITEMS;

  // Accounts has no dashboard: its home is Reconciliation
  useEffect(() => {
    if (isAccounts && (path === "/" || path === "/dashboard")) router.replace("/reconciliation");
  }, [isAccounts, path, router]);
  // Purchase has no dashboard either: its home is Purchases
  useEffect(() => {
    if (isPurchase && (path === "/" || path === "/dashboard")) router.replace("/purchase");
  }, [isPurchase, path, router]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  // Sliding sidebar: full (icons + names) or collapsed (icons only). Remembered per browser.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sg_sidebar_collapsed") === "1");
    } catch {}
  }, []);
  const toggleSidebar = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("sg_sidebar_collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });
  const alertsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setShowAlertsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine current active section for breadcrumb
  const currentNav = [...NAV_ITEMS, ...OWNER_NAV_ITEMS, ...ACCOUNTS_NAV_ITEMS, ...PURCHASE_NAV_ITEMS].find(
    (item) => path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href.split("?")[0])) || (path === "/" && item.href === "/dashboard")
  );

  const screenTitle = currentNav ? currentNav.label : "Dashboard";

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const clean = cleanPlate(searchQuery);
    const q = clean || searchQuery.trim();
    router.push(`/vehicles?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="sg-shell-layout" style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F3F8FA", fontFamily: "'Inter', sans-serif" }}>
      {/* ----------------- LEFT SIDEBAR ----------------- */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          alignSelf: "flex-start",
          flexShrink: 0,
          width: collapsed ? "72px" : "250px",
          transition: "width 0.22s ease",
          zIndex: 40,
        }}
      >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? "Expand the menu" : "Collapse the menu"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand the menu" : "Collapse the menu"}
        style={{
          position: "absolute",
          top: "26px",
          right: "-13px",
          zIndex: 50,
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          padding: 0,
          background: "#FFFFFF",
          border: "1px solid #CDE0E8",
          color: "#10303F",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(16, 48, 63, 0.15)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.22s ease" }}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <aside
        style={{
          width: "100%",
          height: "100%",
          overflowX: "hidden",
          background: "linear-gradient(180deg, #EEF5F8 0%, #F8FBFC 45%, #FFFFFF 100%)",
          color: "#10303F",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #DDE8EE",
          overflowY: "auto",
        }}
      >
        {/* Brand header */}
        <div style={{ padding: collapsed ? "20px 0 18px" : "20px 22px 18px", borderBottom: "1px solid #DDE8EE" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(145deg, #246C8A, #0B1D29)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: "16px",
                color: "#FFFFFF",
                boxShadow: "0 4px 10px -4px rgba(16, 48, 63, 0.5)",
              }}
            >
              XO
            </div>
            <div style={{ display: collapsed ? "none" : "block", whiteSpace: "nowrap" }}>
              <div className="sg-brand-name" style={{ fontWeight: 700, fontSize: "17px" }}>XO SmartGate</div>
              <div style={{ fontSize: "11.5px", color: "#5F707C", whiteSpace: "nowrap" }}>
                Vehicle tracking &amp; billing
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list in exact Owner spec order */}
        <nav style={{ padding: collapsed ? "16px 10px" : "16px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              (item.href === "/dashboard" && (path === "/dashboard" || path === "/")) ||
              (item.href !== "/dashboard" && path.startsWith(item.href.split("?")[0]));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: collapsed ? "10px 0" : "9px 14px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#FFFFFF" : "#33414C",
                  background: isActive ? "linear-gradient(135deg, #246C8A 0%, #10303F 100%)" : "transparent",
                  boxShadow: isActive ? "0 6px 14px -8px rgba(16, 48, 63, 0.55)" : "none",
                  transition: "all 0.18s ease-in-out",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <item.icon />
                  {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with Active Role indication */}
        <div
          style={{
            padding: collapsed ? "14px 0" : "16px",
            borderTop: "1px solid #DDE8EE",
            backgroundColor: "#F3F8FA",
            fontSize: "12.5px",
          }}
        >
          {collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              title={`Signed in as ${user.role}. Open the menu to switch role`}
              aria-label="Open the menu to switch role"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", background: "none", border: "none", cursor: "pointer", gap: "6px" }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981" }} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#10303F" }}>{user.role.slice(0, 2)}</span>
            </button>
          )}
          <div style={{ display: collapsed ? "none" : "block" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981" }} />
              <span style={{ color: "#33414C", fontWeight: 500 }}>
                Signed in as <strong>{user.role}</strong>
              </span>
            </div>
            <button
              onClick={() => setShowRoleSwitcher((s) => !s)}
              title="Test role switcher"
              style={{
                background: "none",
                border: "none",
                color: "#246C8A",
                fontSize: "11px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Switch
            </button>
          </div>

          {/* Quick switcher to verify Rule 1: 'The backend decides what a user may see' */}
          {showRoleSwitcher && (
            <div
              style={{
                marginTop: "10px",
                padding: "8px",
                borderRadius: "6px",
                backgroundColor: "#E6F0F4",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
              }}
            >
              <button
                onClick={() => {
                  switchRole("Owner");
                  setShowRoleSwitcher(false);
                }}
                style={{
                  fontSize: "11px",
                  padding: "4px",
                  background: user.role === "Owner" ? "#246C8A" : "#CDE0E8",
                  color: user.role === "Owner" ? "#fff" : "#10303F",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Owner
              </button>
              <button
                onClick={() => {
                  switchRole("Admin", "service-a");
                  setShowRoleSwitcher(false);
                }}
                style={{
                  fontSize: "11px",
                  padding: "4px",
                  background: user.role === "Admin" ? "#246C8A" : "#CDE0E8",
                  color: user.role === "Admin" ? "#fff" : "#10303F",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Admin (A)
              </button>
              <button
                onClick={() => {
                  switchRole("Accounts");
                  setShowRoleSwitcher(false);
                }}
                style={{
                  fontSize: "11px",
                  padding: "4px",
                  background: user.role === "Accounts" ? "#246C8A" : "#CDE0E8",
                  color: user.role === "Accounts" ? "#fff" : "#10303F",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Accounts
              </button>
              <button
                onClick={() => {
                  switchRole("Purchase", "service-a");
                  setShowRoleSwitcher(false);
                }}
                style={{
                  fontSize: "11px",
                  padding: "4px",
                  background: user.role === "Purchase" ? "#246C8A" : "#CDE0E8",
                  color: user.role === "Purchase" ? "#fff" : "#10303F",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Purchase
              </button>
            </div>
          )}
          </div>
        </div>
      </aside>
      </div>

      {/* ----------------- MAIN AREA ----------------- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar (Section 3.3) */}
        <header
          style={{
            height: "64px",
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid #DDE8EE",
            padding: "0 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
            position: "sticky",
            top: 0,
            zIndex: 30,
            boxShadow: "0 1px 3px rgba(16, 48, 63, 0.04)",
          }}
        >
          {/* Breadcrumb: role › screen name */}
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#10303F", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#64748B", fontWeight: 500 }}>{user.role}</span>
            <span style={{ color: "#CBD5E1" }}>›</span>
            <span>{screenTitle}</span>
          </div>

          {/* Right Controls: Search + Alerts + Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            {/* Global Search Box (Hidden for Purchase) */}
            {user.role !== "Purchase" && (
              <form onSubmit={handleGlobalSearch} style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search car number or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "270px",
                    height: "36px",
                    borderRadius: "20px",
                    border: "1px solid #D0DBE1",
                    padding: "0 14px 0 36px",
                    fontSize: "13px",
                    backgroundColor: "#F8FAFC",
                    color: "#10303F",
                    outline: "none",
                    transition: "border 0.2s ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#246C8A")}
                  onBlur={(e) => (e.target.style.borderColor = "#D0DBE1")}
                />
                <span style={{ position: "absolute", left: "12px", top: "10px", color: "#64748B" }}>
                  <IconSearch />
                </span>
              </form>
            )}

            {/* Notification Bell (Alerts) */}
            <div style={{ position: "relative" }} ref={alertsRef}>
              <button
                onClick={() => setShowAlertsDropdown((prev) => !prev)}
                title="System Alerts"
                style={{
                  position: "relative",
                  background: "#F1F5F9",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  color: "#10303F",
                }}
              >
                <IconBell />
                {alerts.length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      backgroundColor: "#3A88A6",
                      color: "#FFFFFF",
                      fontSize: "10px",
                      fontWeight: 700,
                      borderRadius: "10px",
                      padding: "1px 5px",
                      border: "2px solid #FFFFFF",
                    }}
                  >
                    {alerts.length}
                  </span>
                )}
              </button>

              {/* Alerts Dropdown */}
              {showAlertsDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "44px",
                    right: 0,
                    width: "360px",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px -5px rgba(16, 48, 63, 0.2)",
                    border: "1px solid #DDE8EE",
                    padding: "14px",
                    zIndex: 100,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#10303F" }}>Live Alerts ({alerts.length})</div>
                    <span style={{ fontSize: "11px", color: "#64748B" }}>Click to view details</span>
                  </div>

                  {alerts.length === 0 ? (
                    <div style={{ padding: "16px 0", textAlign: "center", fontSize: "13px", color: "#64748B" }}>No open alerts</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                      {alerts.map((al) => (
                        <div
                          key={al.id}
                          style={{
                            padding: "9px 10px",
                            borderRadius: "8px",
                            backgroundColor: "#F8FAFC",
                            border: "1px solid #EDF2F7",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "8px",
                          }}
                        >
                          <Link
                            href={al.targetUrl}
                            onClick={() => setShowAlertsDropdown(false)}
                            style={{ textDecoration: "none", flex: 1 }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: al.type === "Blocked" ? "#DC2626" : al.type === "Cash" ? "#D97706" : "#246C8A",
                                }}
                              >
                                {al.type}
                              </span>
                              <span style={{ fontSize: "11px", color: "#94A3B8" }}>• {al.timeStr}</span>
                            </div>
                            <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#10303F" }}>{al.title}</div>
                            <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: "2px" }}>{al.detail}</div>
                          </Link>
                          <button
                            onClick={() => dismissAlert(al.id)}
                            title="Dismiss alert"
                            style={{
                              background: "none",
                              border: "none",
                              color: "#94A3B8",
                              fontSize: "14px",
                              cursor: "pointer",
                              padding: "2px 4px",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Avatar & User Details */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#246C8A",
                  color: "#FFFFFF",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: "13px",
                  boxShadow: "0 2px 4px rgba(36, 108, 138, 0.3)",
                }}
              >
                {user.name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#10303F" }}>{user.name}</span>
                <span style={{ fontSize: "11px", color: "#64748B" }}>
                  {user.role} · {user.centreName}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Floating Toast Notification */}
        {toast && (
          <div
            style={{
              position: "fixed",
              top: "76px",
              right: "28px",
              backgroundColor: toast.type === "success" ? "#10B981" : toast.type === "error" ? "#EF4444" : "#246C8A",
              color: "#FFFFFF",
              padding: "10px 18px",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              animation: "fadeIn 0.2s ease-in-out",
            }}
          >
            <span>{toast.message}</span>
          </div>
        )}

        {/* Global Saving Indicator */}
        {isSaving && (
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              backgroundColor: "#10303F",
              color: "#FFFFFF",
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "12.5px",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(16, 48, 63, 0.2)",
              zIndex: 1000,
            }}
          >
            Saving…
          </div>
        )}

        {/* Screen Content Viewport */}
        <main style={{ flex: 1, padding: "28px", maxWidth: "1600px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
