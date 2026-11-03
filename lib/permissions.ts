// Roles and what each role may do. No imports, so it is easy to unit-test.

export type Role = "admin" | "manager" | "supervisor" | "cashier" | "washer";

export const ROLES: { id: Role; label: string; blurb: string }[] = [
  { id: "admin", label: "Admin", blurb: "Full access, including users, roles and backup." },
  { id: "manager", label: "Manager", blurb: "Runs the day: revenue, customers, jobs and payments." },
  { id: "supervisor", label: "Supervisor", blurb: "Manages the wash floor and the job queue." },
  { id: "cashier", label: "Cashier", blurb: "Front desk: registers vehicles and collects payments." },
  { id: "washer", label: "Washer", blurb: "Sees the queue and updates job progress." },
];

export const ROLE_LABEL: Record<Role, string> = Object.fromEntries(ROLES.map((r) => [r.id, r.label])) as Record<Role, string>;

export interface PermDef {
  key: string;
  module: string;
  label: string;
}

export const PERMISSIONS: PermDef[] = [
  { key: "home.view", module: "Home", label: "View dashboard" },
  { key: "revenue.view", module: "Revenue", label: "View revenue" },
  { key: "revenue.export", module: "Revenue", label: "Export reports" },
  { key: "customers.view", module: "Customers & vehicles", label: "View" },
  { key: "customers.create", module: "Customers & vehicles", label: "Add vehicles" },
  { key: "customers.edit", module: "Customers & vehicles", label: "Edit details" },
  { key: "customers.delete", module: "Customers & vehicles", label: "Delete vehicles" },
  { key: "jobs.create", module: "Wash jobs", label: "Create jobs" },
  { key: "jobs.update", module: "Wash jobs", label: "Update job status" },
  { key: "jobs.delete", module: "Wash jobs", label: "Delete jobs" },
  { key: "payments.collect", module: "Payments", label: "Collect payments" },
  { key: "admin.manage", module: "Admin", label: "Users, roles, backup" },
];

/** Admin-only: the admin role always has everything and cannot be edited. */
export const ADMIN_ONLY = new Set(["admin.manage"]);

export type PermissionMap = Record<Role, string[]>;

const ALL = PERMISSIONS.map((p) => p.key);

export const DEFAULT_PERMISSIONS: PermissionMap = {
  admin: ALL,
  manager: ALL.filter((k) => !ADMIN_ONLY.has(k)),
  supervisor: ["home.view", "customers.view", "customers.create", "customers.edit", "jobs.create", "jobs.update"],
  cashier: ["home.view", "customers.view", "customers.create", "jobs.create", "payments.collect"],
  washer: ["home.view", "customers.view", "jobs.update"],
};

/** Merge saved permissions over the defaults and keep the admin role complete. */
export function normalizePermissions(saved: Partial<PermissionMap> | undefined | null): PermissionMap {
  const out = {} as PermissionMap;
  for (const r of ROLES) {
    const base = saved?.[r.id] ?? DEFAULT_PERMISSIONS[r.id];
    out[r.id] = r.id === "admin" ? ALL : base.filter((k) => ALL.includes(k) && !ADMIN_ONLY.has(k));
  }
  return out;
}

export function can(map: PermissionMap, role: Role | undefined, perm: string): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  return map[role]?.includes(perm) ?? false;
}

/** First page a role is allowed to open (used when a role cannot see Home). */
export function firstAllowedPath(map: PermissionMap, role: Role | undefined): string {
  if (can(map, role, "home.view")) return "/";
  if (can(map, role, "customers.view")) return "/customers/";
  if (can(map, role, "revenue.view")) return "/revenue/";
  if (can(map, role, "admin.manage")) return "/admin/";
  return "/";
}
