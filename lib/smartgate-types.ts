export type UserRole = "Owner" | "Admin" | "Manager" | "Accounts" | "Purchase" | "Supervisor" | "Technician";

export interface Centre {
  id: string;
  name: string;
  type: "service" | "washing";
  bays: number;
  address: string;
  phone: string;
  tabletsOnline: number;
}

export interface UserSession {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  centreId: string; // 'all' for Owner & Accounts
  centreName: string;
  active: boolean;
}

export type TimeRange = "today" | "week" | "month";

export interface CentreSummary {
  centreId: string;
  centreName: string;
  type: "service" | "washing";
  vehiclesIn: number;
  collection: number;
  pendingUnbilled: number;
}

export interface ChartDayData {
  dayLabel: string;
  dateStr: string;
  centres: Record<string, number>; // centreId -> amount
  total: number;
}

export interface SmartGateAlert {
  id: string;
  type: "Review" | "Discount" | "Blocked" | "Cash" | "Sync";
  title: string;
  detail: string;
  centreId: string;
  centreName: string;
  timeStr: string;
  targetUrl: string;
  resolved: boolean;
}

export interface AuditRecord {
  id: string;
  time: number;
  timeFormatted: string;
  user: string;
  role: UserRole;
  centre: string;
  action: string;
  record: string;
  before: string;
  after: string;
}
