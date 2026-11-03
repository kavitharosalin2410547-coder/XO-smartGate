"use client";

import React from "react";
import { formatPlateDisplay } from "@/lib/smartgate-utils";

interface CarPlateProps {
  plate: string;
  makeModel?: string | null;
  compact?: boolean;
  className?: string;
}

/**
 * Universal Car Number Component (Section 3.4 of XO SmartGate spec):
 * - Car number in a bordered plate style, e.g. TN 00 AB 0000, always in capitals with spaces.
 * - Make and model directly underneath in small grey text, e.g. "Hyundai · Creta", on every screen, table, export and report.
 * - If make and model are not known yet, show "Details pending".
 */
export default function CarPlate({ plate, makeModel, compact = false, className = "" }: CarPlateProps) {
  const formattedPlate = formatPlateDisplay(plate);
  const subText = makeModel?.trim() || "Details pending";

  return (
    <div className={`sg-car-plate-wrapper ${className}`} style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div
        className="sg-plate-badge"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "'Inter', monospace",
          fontWeight: 700,
          fontSize: compact ? "11.5px" : "13px",
          letterSpacing: "0.8px",
          color: "#0B2A5E",
          background: "#FFFFFF",
          border: "1.5px solid #0B2A5E",
          borderRadius: "4px",
          padding: compact ? "1px 6px" : "2px 8px",
          boxShadow: "0 1px 2px rgba(11, 42, 94, 0.08)",
          textTransform: "uppercase",
        }}
      >
        <span style={{ fontSize: "9px", opacity: 0.6, fontWeight: 800 }}>IND</span>
        <span>{formattedPlate}</span>
      </div>
      <span
        className="sg-plate-subtext"
        style={{
          fontSize: compact ? "10px" : "11px",
          color: "#6b7280",
          marginTop: "2px",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {subText}
      </span>
    </div>
  );
}
