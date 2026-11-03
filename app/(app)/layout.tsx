import React from "react";
import AuthProvider from "@/components/AuthProvider";
import { SmartGateProvider } from "@/components/SmartGateContext";
import SmartGateShell from "@/components/SmartGateShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SmartGateProvider>
        <SmartGateShell>{children}</SmartGateShell>
      </SmartGateProvider>
    </AuthProvider>
  );
}
