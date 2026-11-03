"use client";

import React from "react";

/**
 * Universal State Handlers conforming to Section 3.6 of XO SmartGate spec:
 * - Loading: Grey placeholder rows (no spinners over the whole page)
 * - Empty: A one-line message and the main action
 * - Error: "Couldn't load. Try again" with a retry button; never a blank screen
 * - No permission: "You don't have access to this"
 */

export function LoadingPlaceholderRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="sg-loading-skeleton" style={{ width: "100%", padding: "16px 0" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: "44px",
            background: "linear-gradient(90deg, #E6F0F4 25%, #F3F8FA 50%, #E6F0F4 75%)",
            backgroundSize: "200% 100%",
            animation: "sg-skeleton-shimmer 1.5s infinite",
            borderRadius: "8px",
            marginBottom: "10px",
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

export function EmptyState({ message, actionText, onAction }: { message: string; actionText?: string; onAction?: () => void }) {
  return (
    <div
      style={{
        padding: "36px 20px",
        textAlign: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px dashed #D0DBE1",
        color: "#5F707C",
        fontSize: "14px",
        margin: "12px 0",
      }}
    >
      <p style={{ margin: 0, fontWeight: 500 }}>
        {message}
        {actionText && onAction && (
          <button
            onClick={onAction}
            style={{
              marginLeft: "10px",
              color: "#246C8A",
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {actionText}
          </button>
        )}
      </p>
    </div>
  );
}

export function ErrorRetryState({ onRetry, message = "Couldn't load. Try again" }: { onRetry: () => void; message?: string }) {
  return (
    <div
      style={{
        padding: "32px 20px",
        textAlign: "center",
        backgroundColor: "#FEF2F2",
        borderRadius: "12px",
        border: "1px solid #FCA5A5",
        color: "#991B1B",
        margin: "16px 0",
      }}
    >
      <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "10px" }}>{message}</div>
      <button
        onClick={onRetry}
        style={{
          background: "linear-gradient(135deg, #1A4D64 0%, #0B1D29 100%)",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          padding: "8px 18px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(16, 48, 63, 0.25)",
        }}
      >
        Retry
      </button>
    </div>
  );
}

export function NoPermissionState({ role, required = "Owner" }: { role?: string; required?: string }) {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: "14px",
        border: "1px solid #DDE8EE",
        maxWidth: "600px",
        margin: "40px auto",
        boxShadow: "0 4px 12px rgba(16, 48, 63, 0.05)",
      }}
    >
      <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔒</div>
      <h2 style={{ fontSize: "18px", color: "#10303F", fontWeight: 700, margin: "0 0 8px" }}>You don&apos;t have access to this</h2>
      <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>
        This screen is restricted to <strong>{required}</strong>. Your current role is <strong>{role || "Unknown"}</strong>.
      </p>
    </div>
  );
}
