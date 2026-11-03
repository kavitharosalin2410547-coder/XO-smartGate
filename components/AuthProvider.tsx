"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { currentUsername, logout } from "@/lib/auth";
import { getBusinessName, getUser, loadPermissions, logAction, type User } from "@/lib/db";
import { can as canDo, DEFAULT_PERMISSIONS, type PermissionMap } from "@/lib/permissions";

interface AuthState {
  user: User;
  business: string;
  perms: PermissionMap;
  can: (perm: string) => boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

// Loads the signed-in user, their role and the permission table. If nobody is
// signed in (or the account was disabled) it sends the visitor to /login.
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<{ user: User; business: string; perms: PermissionMap } | null>(null);

  const refresh = useCallback(async () => {
    const name = currentUsername();
    if (!name) {
      router.replace("/login/");
      return;
    }
    const [user, perms, business] = await Promise.all([getUser(name), loadPermissions(), getBusinessName()]);
    if (!user || !user.active) {
      logout();
      router.replace("/login/");
      return;
    }
    setData({ user, perms, business });
  }, [router]);

  useEffect(() => {
    refresh().catch(() => router.replace("/login/"));
  }, [refresh, router]);

  const value = useMemo<AuthState | null>(() => {
    if (!data) return null;
    return {
      ...data,
      can: (perm: string) => canDo(data.perms ?? DEFAULT_PERMISSIONS, data.user.role, perm),
      refresh,
      signOut: () => {
        void logAction("logout", "Signed out", data.user.username);
        logout();
        router.replace("/login/");
      },
    };
  }, [data, refresh, router]);

  if (!value) return <div className="splash">Loading…</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
