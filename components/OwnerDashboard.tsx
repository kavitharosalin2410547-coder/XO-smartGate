"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSmartGate } from "./SmartGateContext";
import { TimeRange, CentreSummary, ChartDayData } from "@/lib/smartgate-types";
import {
  SEED_SUMMARIES_TODAY,
  SEED_SUMMARIES_WEEK,
  SEED_SUMMARIES_MONTH,
  SEED_CHART_7_DAYS,
  CENTRES,
} from "@/lib/smartgate-data";
import { formatIndianCurrency } from "@/lib/smartgate-utils";
import { LoadingPlaceholderRows, NoPermissionState } from "./StateHandlers";

export default function OwnerDashboard() {
  const { user, alerts, dismissAlert } = useSmartGate();
  const router = useRouter();

  const [range, setRange] = useState<TimeRange>("today");
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [nextRefreshSecs, setNextRefreshSecs] = useState<number>(60);
  const [activeCentreFilter, setActiveCentreFilter] = useState<string>("all");

  // Verify Rule 1: Only Owner sees this screen
  const isOwner = user.role === "Owner";

  // Load metrics based on range
  const summaries: CentreSummary[] = useMemo(() => {
    switch (range) {
      case "week":
        return SEED_SUMMARIES_WEEK;
      case "month":
        return SEED_SUMMARIES_MONTH;
      case "today":
      default:
        return SEED_SUMMARIES_TODAY;
    }
  }, [range]);

  const chartData: ChartDayData[] = SEED_CHART_7_DAYS;

  // Manual & auto-refresh logic (Rule: Refreshes every 60 seconds)
  const refreshData = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLastRefreshed(new Date());
      setNextRefreshSecs(60);
      setLoading(false);
    }, 350);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextRefreshSecs((prev) => {
        if (prev <= 1) {
          refreshData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshData]);

  if (!isOwner) {
    return <NoPermissionState role={user.role} required="Owner" />;
  }

  // Calculate totals
  const totalVehiclesIn = summaries.reduce((acc, c) => acc + c.vehiclesIn, 0);
  const totalCollection = summaries.reduce((acc, c) => acc + c.collection, 0);
  const totalPending = summaries.reduce((acc, c) => acc + c.pendingUnbilled, 0);

  // Maximum value for bar scaling in 7-day chart
  const maxBarValue = Math.max(...chartData.map((d) => d.total));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ----------------- SUB-HEADER: TITLE & CONTROLS ----------------- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0B2A5E", margin: 0 }}>
              {range === "today" ? "Today" : range === "week" ? "This Week" : "This Month"} · All centres
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
                color: "#64748B",
                backgroundColor: "#FFFFFF",
                padding: "3px 10px",
                borderRadius: "14px",
                border: "1px solid #E2E8F0",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                  animation: "pulse 2s infinite",
                }}
              />
              Live · Refreshes in {nextRefreshSecs}s
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0" }}>
            Total {totalVehiclesIn} vehicles across 5 centres · {formatIndianCurrency(totalCollection)} collected (paid receipts only)
          </p>
        </div>

        {/* Range Selector Tabs: Today · Week · Month */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              backgroundColor: "#E2E8F0",
              padding: "3px",
              borderRadius: "10px",
              display: "inline-flex",
              gap: "2px",
            }}
          >
            {(["today", "week", "month"] as TimeRange[]).map((tab) => {
              const active = range === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setRange(tab);
                    refreshData();
                  }}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: active ? 700 : 500,
                    color: active ? "#FFFFFF" : "#475569",
                    backgroundColor: active ? "#1A86DD" : "transparent",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <button
            onClick={refreshData}
            title="Refresh now"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              padding: "7px 12px",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#0B2A5E",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingPlaceholderRows rows={3} />
      ) : (
        <>
          {/* ----------------- 5 CENTRE CARDS (Page 5) ----------------- */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "16px",
            }}
          >
            {summaries.map((c) => {
              const centreMeta = CENTRES.find((x) => x.id === c.centreId);
              return (
                <div
                  key={c.centreId}
                  onClick={() => router.push(`/centres/${c.centreId}`)}
                  role="button"
                  tabIndex={0}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "14px",
                    padding: "18px 20px",
                    boxShadow: "0 2px 8px rgba(11, 42, 94, 0.05)",
                    border: "1px solid #E2E8F0",
                    cursor: "pointer",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 18px rgba(11, 42, 94, 0.09)";
                    e.currentTarget.style.borderColor = "#1A86DD";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(11, 42, 94, 0.05)";
                    e.currentTarget.style.borderColor = "#E2E8F0";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#0B2A5E" }}>{c.centreName}</span>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: c.type === "service" ? "#EFF6FF" : "#ECFDF5",
                        color: c.type === "service" ? "#1D4ED8" : "#047857",
                      }}
                    >
                      {c.type === "service" ? `${centreMeta?.bays || 6} Bays` : "Wash Queue"}
                    </span>
                  </div>

                  {/* Vehicles In */}
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#1A86DD", lineHeight: 1.1, marginBottom: "8px" }}>
                    {c.vehiclesIn} <span style={{ fontSize: "16px", fontWeight: 600 }}>in</span>
                  </div>

                  {/* Bottom Stats: Collection & Pending */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "12.5px",
                      color: "#64748B",
                      borderTop: "1px solid #F1F5F9",
                      paddingTop: "10px",
                      marginTop: "6px",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "#0B2A5E" }}>{formatIndianCurrency(c.collection)}</span>
                    <span>•</span>
                    <span style={{ color: c.pendingUnbilled > 0 ? "#D97706" : "#64748B", fontWeight: c.pendingUnbilled > 0 ? 600 : 400 }}>
                      {c.pendingUnbilled} pending
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ----------------- MAIN ROW: 7-DAY CHART + ALERTS PANEL ----------------- */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
              gap: "24px",
              alignItems: "stretch",
            }}
          >
            {/* 7-DAY COMPARATIVE BAR CHART (Page 5) */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                padding: "22px 24px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(11, 42, 94, 0.05)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0B2A5E", margin: 0 }}>
                    Collections by centre · last 7 days
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>Comparative daily revenue across all active units</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11.5px", color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#0B2A5E" }} />
                    <span>Service Centres</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#EF7D00" }} />
                    <span>Wash Branches</span>
                  </div>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "18px",
                  minHeight: "220px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #E2E8F0",
                }}
              >
                {chartData.map((day) => {
                  const serviceTotal = (day.centres["service-a"] || 0) + (day.centres["service-b"] || 0);
                  const washTotal = (day.centres["wash-1"] || 0) + (day.centres["wash-2"] || 0) + (day.centres["wash-3"] || 0);
                  const heightPct = Math.round((day.total / maxBarValue) * 100);

                  return (
                    <div
                      key={day.dayLabel}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        justifyContent: "flex-end",
                        gap: "6px",
                      }}
                    >
                      {/* Bar Stack */}
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "46px",
                          height: `${Math.max(heightPct, 15)}%`,
                          display: "flex",
                          flexDirection: "column",
                          borderRadius: "6px 6px 0 0",
                          overflow: "hidden",
                          boxShadow: "0 2px 4px rgba(11, 42, 94, 0.08)",
                          cursor: "pointer",
                          transition: "opacity 0.15s ease",
                        }}
                        title={`${day.dayLabel}: Total ${formatIndianCurrency(day.total)} (Service: ${formatIndianCurrency(
                          serviceTotal
                        )}, Wash: ${formatIndianCurrency(washTotal)})`}
                      >
                        {/* Service portion (Navy) */}
                        <div
                          style={{
                            height: `${Math.round((serviceTotal / day.total) * 100)}%`,
                            backgroundColor: "#0B2A5E",
                          }}
                        />
                        {/* Wash portion (Orange) */}
                        <div
                          style={{
                            height: `${Math.round((washTotal / day.total) * 100)}%`,
                            backgroundColor: "#EF7D00",
                          }}
                        />
                      </div>

                      {/* Day Label */}
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: day.dayLabel === "Today" ? 700 : 500,
                          color: day.dayLabel === "Today" ? "#1A86DD" : "#64748B",
                        }}
                      >
                        {day.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Footnote Summary */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "14px",
                  fontSize: "12.5px",
                }}
              >
                <div style={{ color: "#64748B" }}>
                  7-Day Total:{" "}
                  <strong style={{ color: "#0B2A5E" }}>
                    {formatIndianCurrency(chartData.reduce((acc, d) => acc + d.total, 0))}
                  </strong>
                </div>
                <div style={{ color: "#1A86DD", fontWeight: 600 }}>Click any centre card above for live bay breakdown →</div>
              </div>
            </div>

            {/* ALERTS PANEL (Page 5 & 6) */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                padding: "22px 20px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(11, 42, 94, 0.05)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0B2A5E", margin: 0 }}>Alerts</h3>
                  <span
                    style={{
                      backgroundColor: "#EF7D00",
                      color: "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "10px",
                    }}
                  >
                    {alerts.length}
                  </span>
                </div>
                <span style={{ fontSize: "11.5px", color: "#64748B" }}>Click to open record</span>
              </div>

              {alerts.length === 0 ? (
                <div
                  style={{
                    padding: "30px 10px",
                    textAlign: "center",
                    color: "#64748B",
                    fontSize: "13px",
                  }}
                >
                  ✓ All systems operating smoothly. No open alerts.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                  {alerts.map((al) => {
                    let badgeBg = "#EFF6FF";
                    let badgeColor = "#1D4ED8";
                    if (al.type === "Blocked") {
                      badgeBg = "#FEF2F2";
                      badgeColor = "#DC2626";
                    } else if (al.type === "Cash") {
                      badgeBg = "#FFFBEB";
                      badgeColor = "#B45309";
                    } else if (al.type === "Discount") {
                      badgeBg = "#F5F3FF";
                      badgeColor = "#7C3AED";
                    } else if (al.type === "Sync") {
                      badgeBg = "#FEF3C7";
                      badgeColor = "#D97706";
                    }

                    return (
                      <div
                        key={al.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          backgroundColor: "#F8FAFC",
                          border: "1px solid #EDF2F7",
                          gap: "10px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Link
                          href={al.targetUrl}
                          style={{ textDecoration: "none", flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: badgeBg,
                                color: badgeColor,
                              }}
                            >
                              {al.type}
                            </span>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#0B2A5E" }}>{al.title}</span>
                          </div>
                          <span style={{ fontSize: "11.5px", color: "#64748B" }}>
                            {al.centreName} • {al.detail}
                          </span>
                        </Link>

                        <button
                          onClick={() => dismissAlert(al.id)}
                          title="Dismiss"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#94A3B8",
                            fontSize: "16px",
                            cursor: "pointer",
                            padding: "0 4px",
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
