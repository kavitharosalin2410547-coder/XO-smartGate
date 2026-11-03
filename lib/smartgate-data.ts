import { Centre, CentreSummary, ChartDayData, SmartGateAlert, AuditRecord, UserSession, TimeRange } from "./smartgate-types";
import { formatTimeIndia, formatDateIndia } from "./smartgate-utils";

export const CENTRES: Centre[] = [
  {
    id: "service-a",
    name: "Service A",
    type: "service",
    bays: 8,
    address: "Plot 12, Industrial Area, Phase 1",
    phone: "+91 98400 11001",
    tabletsOnline: 4,
  },
  {
    id: "service-b",
    name: "Service B",
    type: "service",
    bays: 6,
    address: "Block C, 2nd Main Road, Ring Road",
    phone: "+91 98400 11002",
    tabletsOnline: 3,
  },
  {
    id: "wash-1",
    name: "Wash 1",
    type: "washing",
    bays: 3,
    address: "Sector 4, Main Highway Corridor",
    phone: "+91 98400 11003",
    tabletsOnline: 2,
  },
  {
    id: "wash-2",
    name: "Wash 2",
    type: "washing",
    bays: 3,
    address: "Downtown Hub, Opp Grand Mall",
    phone: "+91 98400 11004",
    tabletsOnline: 2,
  },
  {
    id: "wash-3",
    name: "Wash 3",
    type: "washing",
    bays: 2,
    address: "Airport Road Junction",
    phone: "+91 98400 11005",
    tabletsOnline: 1, // 1 tablet offline triggering alert
  },
];

export const DEFAULT_USER_SESSION: UserSession = {
  id: "usr-owner-001",
  name: "Rajesh Sharma",
  mobile: "+91 98400 00001",
  role: "Owner",
  centreId: "all",
  centreName: "All centres",
  active: true,
};

// Seed figures matching the exact mockups in the specification (Page 5)
export const SEED_SUMMARIES_TODAY: CentreSummary[] = [
  {
    centreId: "service-a",
    centreName: "Service A",
    type: "service",
    vehiclesIn: 14,
    collection: 186400,
    pendingUnbilled: 3,
  },
  {
    centreId: "service-b",
    centreName: "Service B",
    type: "service",
    vehiclesIn: 11,
    collection: 142900,
    pendingUnbilled: 2,
  },
  {
    centreId: "wash-1",
    centreName: "Wash 1",
    type: "washing",
    vehiclesIn: 38,
    collection: 19800,
    pendingUnbilled: 0,
  },
  {
    centreId: "wash-2",
    centreName: "Wash 2",
    type: "washing",
    vehiclesIn: 31,
    collection: 16200,
    pendingUnbilled: 1,
  },
  {
    centreId: "wash-3",
    centreName: "Wash 3",
    type: "washing",
    vehiclesIn: 27,
    collection: 14050,
    pendingUnbilled: 0,
  },
];

export const SEED_SUMMARIES_WEEK: CentreSummary[] = [
  { centreId: "service-a", centreName: "Service A", type: "service", vehiclesIn: 98, collection: 1245000, pendingUnbilled: 3 },
  { centreId: "service-b", centreName: "Service B", type: "service", vehiclesIn: 79, collection: 980500, pendingUnbilled: 2 },
  { centreId: "wash-1", centreName: "Wash 1", type: "washing", vehiclesIn: 245, collection: 138500, pendingUnbilled: 0 },
  { centreId: "wash-2", centreName: "Wash 2", type: "washing", vehiclesIn: 212, collection: 118400, pendingUnbilled: 1 },
  { centreId: "wash-3", centreName: "Wash 3", type: "washing", vehiclesIn: 184, collection: 96800, pendingUnbilled: 0 },
];

export const SEED_SUMMARIES_MONTH: CentreSummary[] = [
  { centreId: "service-a", centreName: "Service A", type: "service", vehiclesIn: 412, collection: 5280000, pendingUnbilled: 3 },
  { centreId: "service-b", centreName: "Service B", type: "service", vehiclesIn: 340, collection: 4190000, pendingUnbilled: 2 },
  { centreId: "wash-1", centreName: "Wash 1", type: "washing", vehiclesIn: 994, collection: 582000, pendingUnbilled: 0 },
  { centreId: "wash-2", centreName: "Wash 2", type: "washing", vehiclesIn: 885, collection: 495000, pendingUnbilled: 1 },
  { centreId: "wash-3", centreName: "Wash 3", type: "washing", vehiclesIn: 760, collection: 405000, pendingUnbilled: 0 },
];

// 7-day collections bar chart data for all centres
export const SEED_CHART_7_DAYS: ChartDayData[] = [
  {
    dayLabel: "27 Oct",
    dateStr: "2026-10-27",
    centres: { "service-a": 165000, "service-b": 132000, "wash-1": 18200, "wash-2": 15400, "wash-3": 13100 },
    total: 343700,
  },
  {
    dayLabel: "28 Oct",
    dateStr: "2026-10-28",
    centres: { "service-a": 178000, "service-b": 140000, "wash-1": 19100, "wash-2": 16000, "wash-3": 14200 },
    total: 367300,
  },
  {
    dayLabel: "29 Oct",
    dateStr: "2026-10-29",
    centres: { "service-a": 192000, "service-b": 145000, "wash-1": 21000, "wash-2": 17500, "wash-3": 14900 },
    total: 390400,
  },
  {
    dayLabel: "30 Oct",
    dateStr: "2026-10-30",
    centres: { "service-a": 174000, "service-b": 138000, "wash-1": 20400, "wash-2": 16800, "wash-3": 13600 },
    total: 362800,
  },
  {
    dayLabel: "31 Oct",
    dateStr: "2026-10-31",
    centres: { "service-a": 205000, "service-b": 154000, "wash-1": 22500, "wash-2": 18900, "wash-3": 15600 },
    total: 416000,
  },
  {
    dayLabel: "01 Nov",
    dateStr: "2026-11-01",
    centres: { "service-a": 189000, "service-b": 149000, "wash-1": 21300, "wash-2": 17600, "wash-3": 14800 },
    total: 391700,
  },
  {
    dayLabel: "Today",
    dateStr: "2026-11-02",
    centres: { "service-a": 186400, "service-b": 142900, "wash-1": 19800, "wash-2": 16200, "wash-3": 14050 },
    total: 379350,
  },
];

// Open alerts matching page 5
export const SEED_ALERTS: SmartGateAlert[] = [
  {
    id: "alt-01",
    type: "Review",
    title: "2 manual plate entries",
    detail: "TN 00 AB 0009 and TN 00 CD 1234 were typed manually instead of OCR capture",
    centreId: "service-a",
    centreName: "Service A",
    timeStr: "09:12",
    targetUrl: "/audit?action=Plate+typed+by+hand",
    resolved: false,
  },
  {
    id: "alt-02",
    type: "Discount",
    title: "15% at Service B",
    detail: "Invoice INV-0877 applied 15% discount (exceeds supervisor 5% threshold)",
    centreId: "service-b",
    centreName: "Service B",
    timeStr: "10:42",
    targetUrl: "/audit?action=Discount+given",
    resolved: false,
  },
  {
    id: "alt-03",
    type: "Blocked",
    title: "check-in tried at Wash 2",
    detail: "TN 00 EF 2222 stopped at plate confirm, supervisor alerted",
    centreId: "wash-2",
    centreName: "Wash 2",
    timeStr: "11:05",
    targetUrl: "/blocklist",
    resolved: false,
  },
  {
    id: "alt-04",
    type: "Cash",
    title: "₹500 short at Wash 1",
    detail: "Cash drawer counted ₹34,000 against ₹34,500 receipts logged",
    centreId: "wash-1",
    centreName: "Wash 1",
    timeStr: "11:30",
    targetUrl: "/audit?action=Cash+short",
    resolved: false,
  },
  {
    id: "alt-05",
    type: "Sync",
    title: "Wash 3 tablet offline 25 min",
    detail: "Tablet 2 (Wash Bay 2) stopped responding since 11:15",
    centreId: "wash-3",
    centreName: "Wash 3",
    timeStr: "11:40",
    targetUrl: "/centres/wash-3",
    resolved: false,
  },
];

export const SEED_AUDIT_LOGS: AuditRecord[] = [
  {
    id: "aud-1",
    time: Date.now() - 1000 * 60 * 18,
    timeFormatted: "10:42",
    user: "Karthik Raja",
    role: "Supervisor",
    centre: "Service B",
    action: "Discount given",
    record: "INV-0101 · TN 00 AB 0001",
    before: "0%",
    after: "5%",
  },
  {
    id: "aud-2",
    time: Date.now() - 1000 * 60 * 29,
    timeFormatted: "10:31",
    user: "Manoj Kumar",
    role: "Technician",
    centre: "Service A",
    action: "Task completed",
    record: "JC-0102 · TN 00 AB 0004",
    before: "Pending",
    after: "Brake check done",
  },
  {
    id: "aud-3",
    time: Date.now() - 1000 * 60 * 45,
    timeFormatted: "10:15",
    user: "Vignesh Admin",
    role: "Admin",
    centre: "Service A",
    action: "Price changed",
    record: "Engine oil 3.5 L [Brand A] OEM",
    before: "₹2,800",
    after: "₹2,950",
  },
  {
    id: "aud-4",
    time: Date.now() - 1000 * 60 * 62,
    timeFormatted: "09:58",
    user: "Suresh P.",
    role: "Purchase",
    centre: "Service A",
    action: "Purchase saved",
    record: "PB-0045 · [Bosch India]",
    before: "Draft",
    after: "12 lines submitted",
  },
  {
    id: "aud-5",
    time: Date.now() - 1000 * 60 * 80,
    timeFormatted: "09:40",
    user: "Karthik Raja",
    role: "Supervisor",
    centre: "Service B",
    action: "Vehicle let out",
    record: "PASS-0099 · TN 00 AB 0007",
    before: "Ready for exit",
    after: "Paid receipt RCT-1149",
  },
  {
    id: "aud-6",
    time: Date.now() - 1000 * 60 * 108,
    timeFormatted: "09:12",
    user: "Ramesh S.",
    role: "Supervisor",
    centre: "Service A",
    action: "Plate typed by hand",
    record: "TN 00 AB 0009",
    before: "Camera blur",
    after: "Manual input (Needs review)",
  },
];

// Helper to record audit trail entries in compliance with Rule 3:
// "Every change is written to the audit trail (who, role, centre, time, before -> after)"
export function addAuditEntry(entry: Omit<AuditRecord, "id" | "time" | "timeFormatted">): AuditRecord {
  const now = new Date();
  const newRecord: AuditRecord = {
    ...entry,
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    time: now.getTime(),
    timeFormatted: formatTimeIndia(now),
  };

  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("smartgate_audit_logs");
      const current: AuditRecord[] = stored ? JSON.parse(stored) : SEED_AUDIT_LOGS;
      current.unshift(newRecord);
      localStorage.setItem("smartgate_audit_logs", JSON.stringify(current.slice(0, 500)));
    }
  } catch (err) {
    console.error("Failed to append to audit trail:", err);
  }

  return newRecord;
}

export function getAuditLogs(): AuditRecord[] {
  if (typeof window === "undefined") return SEED_AUDIT_LOGS;
  try {
    const stored = localStorage.getItem("smartgate_audit_logs");
    return stored ? JSON.parse(stored) : SEED_AUDIT_LOGS;
  } catch {
    return SEED_AUDIT_LOGS;
  }
}
