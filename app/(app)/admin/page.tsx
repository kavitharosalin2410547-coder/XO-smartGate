"use client";

import { useState } from "react";
import RequirePerm from "@/components/RequirePerm";
import { PageHead } from "@/components/ui";
import ActivityTab from "@/components/admin/ActivityTab";
import DeviceTab from "@/components/admin/DeviceTab";
import RolesTab from "@/components/admin/RolesTab";
import UsersTab from "@/components/admin/UsersTab";

const TABS = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles & permissions" },
  { id: "activity", label: "Activity log" },
  { id: "device", label: "Backup & device" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function AdminPage() {
  return (
    <RequirePerm perm="admin.manage">
      <Admin />
    </RequirePerm>
  );
}

function Admin() {
  const [tab, setTab] = useState<Tab>("users");
  return (
    <>
      <PageHead title="Admin" sub="Manage your team, what each role can do, and your data." />
      <div className="tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-body">
        {tab === "users" && <UsersTab />}
        {tab === "roles" && <RolesTab />}
        {tab === "activity" && <ActivityTab />}
        {tab === "device" && <DeviceTab />}
      </div>
    </>
  );
}
