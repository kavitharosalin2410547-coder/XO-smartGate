"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccountsError } from "@/lib/accounts";

// Small building blocks shared by the three Accounts screens. They use the same
// Ocean Blue colours as the rest of XO SmartGate.

export const C = {
  navy: "#10303F",
  blue: "#246C8A",
  orange: "#3A88A6",
  bg: "#FFFFFF",
  line: "#DDE8EE",
  muted: "#64748B",
  green: "#059669",
  red: "#DC2626",
  amber: "#D97706",
  purple: "#7C3AED",
  ink: "#0F172A",
};

export const cardStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: "14px",
  border: `1px solid ${C.line}`,
  boxShadow: "0 2px 8px rgba(16, 48, 63, 0.05)",
};

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h1 style={{ fontSize: "22px", fontWeight: 700, color: C.navy, margin: 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: "13px", color: C.muted, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

type BtnProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
  small?: boolean;
};

/** The one main button on a screen: deep teal gradient (Ocean Blue). */
export function PrimaryButton({ children, onClick, disabled, title, type = "button", small }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: disabled ? "#A5C3D1" : "linear-gradient(135deg, #1A4D64 0%, #0B1D29 100%)",
        color: "#FFFFFF",
        border: "none",
        borderRadius: "999px",
        padding: small ? "6px 14px" : "9px 20px",
        fontSize: small ? "12.5px" : "13.5px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 6px 14px -8px rgba(16, 48, 63, 0.55)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

/** Secondary button: white with a blue outline. */
export function OutlineButton({ children, onClick, disabled, title, type = "button", small }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: "#FFFFFF",
        color: disabled ? "#94A3B8" : C.blue,
        border: `1.5px solid ${disabled ? "#CBD5E1" : C.blue}`,
        borderRadius: "999px",
        padding: small ? "5px 13px" : "8px 18px",
        fontSize: small ? "12.5px" : "13.5px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export function LinkButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{ background: "none", border: "none", padding: 0, color: C.blue, fontWeight: 600, fontSize: "13px", cursor: "pointer", textAlign: "left" }}
    >
      {children}
    </button>
  );
}

const fieldBox: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  backgroundColor: "#FFFFFF",
  border: "1px solid #CBD5E1",
  borderRadius: "10px",
  padding: "0 12px",
  height: "38px",
  fontSize: "13px",
  color: C.navy,
};

const bareInput: React.CSSProperties = {
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: "13px",
  fontWeight: 600,
  color: C.navy,
  fontFamily: "inherit",
  cursor: "pointer",
};

export function SelectBox({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label style={{ ...fieldBox, opacity: disabled ? 0.7 : 1 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} style={{ ...bareInput, cursor: disabled ? "default" : "pointer" }}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DateBox({ label, value, onChange, min, max }: { label: string; value: string; onChange: (v: string) => void; min?: string; max?: string }) {
  return (
    <label style={fieldBox}>
      <span style={{ color: C.muted }}>{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        style={bareInput}
      />
    </label>
  );
}

export type Tone = "green" | "orange" | "red" | "purple" | "grey";
const TONE: Record<Tone, string> = { green: C.green, orange: C.amber, red: C.red, purple: C.purple, grey: C.muted };

/** A dot and a word, like "• Matched" in the mock-ups. */
export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: TONE[tone], fontWeight: 700, fontSize: "12.5px", whiteSpace: "nowrap" }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: TONE[tone] }} />
      {children}
    </span>
  );
}

export function SummaryCard({ label, value, children }: { label: string; value: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div style={{ ...cardStyle, padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
      <div style={{ fontSize: "12.5px", color: C.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: C.navy, lineHeight: 1.15 }}>{value}</div>
      {children && <div style={{ fontSize: "12.5px", display: "flex", flexDirection: "column", gap: "6px", marginTop: "2px" }}>{children}</div>}
    </div>
  );
}

export function Banner({ tone, children }: { tone: "info" | "warn" | "danger" | "ok"; children: React.ReactNode }) {
  const t = {
    info: { bg: "#E6F0F4", bd: "#BFDBFE", fg: "#1E3A8A" },
    warn: { bg: "#FFFBEB", bd: "#FDE68A", fg: "#92400E" },
    danger: { bg: "#FEF2F2", bd: "#FCA5A5", fg: "#991B1B" },
    ok: { bg: "#ECFDF5", bd: "#A7F3D0", fg: "#065F46" },
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} style={{ backgroundColor: t.bg, border: `1px solid ${t.bd}`, color: t.fg, borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 500 }}>
      {children}
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
}

export function Modal({ title, onClose, children, width = 460 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  useEscape(onClose);
  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(16, 48, 63, 0.45)", display: "grid", placeItems: "center", zIndex: 500, padding: "20px" }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} style={{ ...cardStyle, width: "100%", maxWidth: `${width}px`, padding: "22px 24px", boxShadow: "0 20px 40px rgba(16, 48, 63, 0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: C.navy, margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: "20px", color: "#94A3B8", cursor: "pointer", lineHeight: 1 }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEscape(onClose);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(16, 48, 63, 0.35)", zIndex: 400 }}>
      <aside
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(460px, 100%)", backgroundColor: "#FFFFFF", boxShadow: "-12px 0 30px rgba(16, 48, 63, 0.2)", overflowY: "auto", outline: "none", animation: "fadeIn 0.18s ease-in-out" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, backgroundColor: "#FFFFFF" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: C.navy, margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: "22px", color: "#94A3B8", cursor: "pointer", lineHeight: 1 }}>
            ×
          </button>
        </div>
        <div style={{ padding: "20px 24px 28px" }}>{children}</div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- loading data

export type Query<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "denied" } | { status: "error"; message: string };

/** Runs `load` (which may throw AccountsError) whenever `deps` change; `reload` runs it again. */
export function useQuery<T>(load: () => T, deps: React.DependencyList): [Query<T>, () => void] {
  const [state, setState] = useState<Query<T>>({ status: "loading" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    try {
      setState({ status: "ready", data: load() });
    } catch (e) {
      if (e instanceof AccountsError && e.code === "no-access") setState({ status: "denied" });
      else setState({ status: "error", message: e instanceof AccountsError ? e.message : "Couldn't load. Try again" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return [state, reload];
}
