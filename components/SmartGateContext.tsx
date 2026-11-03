"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { UserSession, SmartGateAlert, UserRole } from "@/lib/smartgate-types";
import { DEFAULT_USER_SESSION, SEED_ALERTS, CENTRES } from "@/lib/smartgate-data";

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface SmartGateContextType {
  user: UserSession;
  setUser: (user: UserSession) => void;
  switchRole: (role: UserRole, centreId?: string) => void;
  alerts: SmartGateAlert[];
  dismissAlert: (id: string) => void;
  toast: ToastMessage | null;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  clearToast: () => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
}

const SmartGateContext = createContext<SmartGateContextType | undefined>(undefined);

export function SmartGateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession>(DEFAULT_USER_SESSION);
  const [alerts, setAlerts] = useState<SmartGateAlert[]>(SEED_ALERTS);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load persisted session if any
  useEffect(() => {
    try {
      const saved = localStorage.getItem("smartgate_user_session");
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const switchRole = useCallback((role: UserRole, centreId?: string) => {
    let centreName = "All centres";
    let targetCentre = "all";

    if (role === "Admin" || role === "Manager" || role === "Purchase") {
      targetCentre = centreId || "service-a";
      const c = CENTRES.find((item) => item.id === targetCentre);
      centreName = c ? c.name : "Service A";
    }

    const updated: UserSession = {
      id: `usr-${role.toLowerCase()}-01`,
      name: role === "Owner" ? "Rajesh Sharma" : `${role} User`,
      mobile: "+91 98400 12345",
      role,
      centreId: targetCentre,
      centreName,
      active: true,
    };

    setUser(updated);
    try {
      localStorage.setItem("smartgate_user_session", JSON.stringify(updated));
    } catch {}
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = `${Date.now()}`;
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3500);
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  return (
    <SmartGateContext.Provider
      value={{
        user,
        setUser,
        switchRole,
        alerts,
        dismissAlert,
        toast,
        showToast,
        clearToast,
        isSaving,
        setIsSaving,
      }}
    >
      {children}
    </SmartGateContext.Provider>
  );
}

export function useSmartGate() {
  const ctx = useContext(SmartGateContext);
  if (!ctx) throw new Error("useSmartGate must be used within SmartGateProvider");
  return ctx;
}
