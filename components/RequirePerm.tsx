"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { IconLock } from "./icons";
import { firstAllowedPath } from "@/lib/permissions";

// Wrap a page so only roles with the permission can see it.
export default function RequirePerm({ perm, children }: { perm: string; children: React.ReactNode }) {
  const { can, perms, user } = useAuth();
  if (can(perm)) return <>{children}</>;
  const home = firstAllowedPath(perms, user.role);
  return (
    <div className="card empty-state">
      <IconLock size={28} />
      <h2>You don&apos;t have access to this page</h2>
      <p className="muted">Your role ({user.role}) isn&apos;t allowed to open it. Ask an admin if you need access.</p>
      <Link className="btn secondary" href={home}>
        Go to an allowed page
      </Link>
    </div>
  );
}
