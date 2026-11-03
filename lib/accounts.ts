// Accounts: daily reconciliation (W5), discount audit (W6) and money reports (W12).
//
// Everything here is plain TypeScript with no React and no browser calls, so it
// can be unit-tested with `node --test`. The app plugs in its own centres and
// dashboard figures (see lib/accounts-app.ts), and a store for the few things
// Accounts can change (cash counted, notes, closing a day).
//
// Rule 1 of the spec: "the backend decides what a user may see". Every function
// here checks the user's role and centre first and throws AccountsError when the
// request is outside it, so hiding a button in the UI is never the only guard.

// ---------------------------------------------------------------- types

export interface LedgerCentre {
  id: string;
  name: string;
  type: "service" | "washing";
}

export interface LedgerSeed {
  centres: LedgerCentre[];
  /** The day the dashboard calls "Today", as YYYY-MM-DD. */
  today: string;
  /** Dashboard figures for today: receipts must add up to these. */
  todaySummaries: { centreId: string; vehiclesIn: number; collection: number; pendingUnbilled: number }[];
  /** Dashboard 7-day chart: collection per centre per day. */
  chart: { dateStr: string; centres: Record<string, number> }[];
}

/** The part of the signed-in session that decides access. */
export interface AcctUser {
  name: string;
  role: string;
  centreId: string;
}

export type ErrorCode = "no-access" | "closed" | "not-ready" | "invalid";

export class AccountsError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type PayMode = "Pine Labs" | "Cash";
export type ReceiptStatus = "Matched" | "Not in cash count" | "Not settled" | "Late sync";

export interface Receipt {
  id: string; // RCT-1150
  no: number;
  date: string;
  time: string; // HH:MM
  centreId: string;
  centreName: string;
  customer: string;
  plate: string; // TN 09 AB 1234
  makeModel: string | null;
  mode: PayMode;
  amount: number; // rupees, whole
  settled: boolean; // Pine Labs receipts: appears in the Pine Labs settlement
  inCount: boolean; // Cash receipts: found in the cash count
  lateSync: boolean; // came from a tablet that was offline
  invoiceNo: string;
  discountPct: number;
  discountBy: string | null;
  discountRole: string | null;
}

export interface ReceiptRow extends Receipt {
  status: ReceiptStatus;
  note: string | null;
}

// ---- Vehicle search (W3)

export interface VehicleSummary {
  plate: string;
  makeModel: string | null;
  owner: string;
  phoneMasked: string; // +91 XXXXX X1234
  visits: number;
  lastDate: string;
  lastCentre: string;
}

export interface VehicleVisit {
  receiptId: string;
  date: string;
  time: string;
  centreId: string;
  centreName: string;
  jobCard: string;
  invoiceNo: string;
  mode: PayMode;
  discountPct: number;
  amount: number;
}

export interface VehicleDetail extends VehicleSummary {
  otherVehicles: { plate: string; makeModel: string | null }[];
  history: VehicleVisit[];
  totalSpent: number;
  /** Accounts sees visits and bills but not photos (spec W3). */
  canSeePhotos: boolean;
}

export interface VehicleSearchResult {
  query: string;
  kind: "plate" | "phone";
  matches: VehicleSummary[];
}

export interface DayState {
  cashCounted?: number;
  notes: Record<string, string>; // receipt id or "cash" -> explanation
  closed?: { by: string; role: string; at: number };
}

export interface StateStore {
  get(date: string, centreId: string): DayState | undefined;
  set(date: string, centreId: string, state: DayState): void;
}

export interface AuditInput {
  user: string;
  role: string;
  centre: string;
  action: string;
  record: string;
  before: string;
  after: string;
}

/** One line on a supplier's bill: what a centre bought, from whom, and what it cost. */
export interface PurchaseEntry {
  id: string; // PUR-0001
  date: string;
  centreId: string;
  centreName: string;
  supplier: string;
  billNo: string;
  item: string;
  qty: number;
  rate: number; // per unit, before GST, whole rupees
  amount: number; // qty x rate
  gst: number;
  total: number;
  addedBy: string;
  role: string;
}

export interface PurchaseStore {
  /** Entries people added (the seeded history is generated, not stored). */
  added(): PurchaseEntry[];
  add(entry: PurchaseEntry): void;
}

export interface PurchaseInput {
  date: string;
  centreId: string;
  supplier: string;
  billNo: string;
  item: string;
  qty: number;
  rate: number;
}

export interface PurchaseTotals {
  count: number;
  amount: number;
  gst: number;
  total: number;
}

export interface PurchaseReport {
  rows: PurchaseEntry[];
  summary: PurchaseTotals;
  byCentre: (PurchaseTotals & { centreId: string; centreName: string })[];
  canAdd: boolean;
}

export interface LedgerDeps {
  store: StateStore;
  /** Where purchases people add are kept. Defaults to memory. */
  purchases?: PurchaseStore;
  audit?: (entry: AuditInput) => void;
  now?: () => number;
}

export interface Difference {
  key: string; // receipt id or "cash"
  label: string;
  note: string | null;
}

export interface CentreState {
  centreId: string;
  centreName: string;
  closed: boolean;
  differences: number;
  missingNotes: number;
  cashCounted: number | null;
}

export interface Reconciliation {
  date: string;
  centreId: string; // a centre id or "all"
  receipts: ReceiptRow[];
  summary: {
    receiptsTotal: number;
    receiptsCount: number;
    pineTotal: number;
    pineSettled: number;
    pineUnsettled: number;
    cashTotal: number;
    cashExpected: number; // cash receipts that are in the count
    cashCounted: number | null;
    cashDiff: number | null; // negative = short, positive = extra
    centresCounted: number;
    centresTotal: number;
  };
  differences: Difference[];
  missingNotes: number;
  closed: { by: string; role: string; at: number } | null; // single centre only
  centreStates: CentreState[];
  canEdit: boolean;
  canClose: boolean;
  blockers: string[]; // why the day cannot be closed yet
}

export interface BillLine {
  desc: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Bill {
  receiptId: string;
  invoiceNo: string;
  date: string;
  time: string;
  centreName: string;
  customer: string;
  plate: string;
  makeModel: string | null;
  lines: BillLine[];
  subtotal: number;
  discountPct: number;
  discountValue: number;
  discountBy: string | null;
  discountRole: string | null;
  taxable: number;
  gstPct: number;
  gst: number;
  total: number;
  mode: PayMode;
  pineRef: string | null;
  passNo: string;
  gateTime: string;
  status: ReceiptStatus;
}

export interface DiscountRow {
  receiptId: string;
  date: string;
  time: string;
  centreId: string;
  centreName: string;
  invoiceNo: string;
  plate: string;
  makeModel: string | null;
  pct: number;
  value: number;
  approvedBy: string;
  role: string;
  cap: number;
  overCap: boolean;
}

export interface DiscountReport {
  rows: DiscountRow[];
  approvers: string[];
  summary: { count: number; value: number; atTopTier: number; overCap: number };
}

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  kind?: "text" | "money" | "int" | "pct" | "plate";
}

export type ReportCell = string | number | null;

export interface ReportResult {
  id: string;
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: Record<string, ReportCell>[];
  totals: Record<string, ReportCell> | null;
  note: string | null;
}

export interface ReportDef {
  id: string;
  label: string;
  roles: string[];
  /** Built in this version. The others are listed in the spec but belong to other screens. */
  ready: boolean;
}

// ---------------------------------------------------------------- rules

/** Max discount per role (spec W8, proposed). Anyone not listed may give none. */
export const DISCOUNT_CAPS: Record<string, number> = { Owner: 15, Admin: 10, Manager: 10, Supervisor: 5 };
export const TOP_DISCOUNT_TIER = 15;
export const GST_PCT = 18;

const VIEW_ROLES = ["Owner", "Accounts", "Admin", "Manager"];
const EDIT_ROLES = ["Owner", "Accounts"];
const VEHICLE_ROLES = ["Owner", "Accounts", "Admin", "Manager"];
const PHOTO_ROLES = ["Owner", "Admin", "Manager"];
const ALL_CENTRE_ROLES = ["Owner", "Accounts"];
/** Who can see purchases, and who can enter them. Purchase, Admin and Manager only ever see their own centre. */
const PURCHASE_VIEW_ROLES = ["Owner", "Accounts", "Admin", "Manager", "Purchase"];
const PURCHASE_ADD_ROLES = ["Owner", "Purchase"];
export const PURCHASE_BACKDATE_DAYS = 7;

/** What each kind of centre buys, with a usual price, so the form can suggest items. */
export const PURCHASE_CATALOG: Record<"service" | "washing", { item: string; rate: number }[]> = {
  service: [
    { item: "Engine oil 5W-30 (4 L)", rate: 1800 },
    { item: "Oil filter", rate: 320 },
    { item: "Brake pads (set)", rate: 2400 },
    { item: "Air filter", rate: 450 },
    { item: "Spark plugs (set of 4)", rate: 900 },
    { item: "Coolant (5 L)", rate: 780 },
    { item: "Wiper blades (pair)", rate: 520 },
  ],
  washing: [
    { item: "Car shampoo (5 L)", rate: 650 },
    { item: "Wax polish (1 kg)", rate: 900 },
    { item: "Microfibre cloths (pack of 10)", rate: 480 },
    { item: "Tyre dressing (5 L)", rate: 720 },
    { item: "Glass cleaner (5 L)", rate: 380 },
    { item: "Foam lance refill", rate: 1200 },
  ],
};
export const PURCHASE_SUPPLIERS: Record<"service" | "washing", string[]> = {
  service: ["Sri Murugan Auto Spares", "Chennai Lubricants", "Anand Motor Parts"],
  washing: ["Shine Care Supplies", "Clean Pro Traders"],
};

export const REPORTS: ReportDef[] = [
  { id: "daily-collection", label: "Daily collection", roles: ["Owner", "Admin", "Manager", "Accounts"], ready: true },
  { id: "job-card-summary", label: "Job card summary", roles: ["Owner", "Admin", "Manager"], ready: false },
  { id: "technician-work", label: "Technician work", roles: ["Owner", "Admin", "Manager"], ready: false },
  { id: "membership", label: "Membership", roles: ["Owner", "Admin", "Manager", "Accounts"], ready: true },
  { id: "purchase-cost", label: "Purchase & parts cost", roles: ["Owner", "Admin", "Manager", "Accounts", "Purchase"], ready: true },
  { id: "discounts", label: "Discounts", roles: ["Owner", "Admin", "Manager", "Accounts"], ready: true },
  { id: "reminder-results", label: "Reminder results", roles: ["Owner", "Admin", "Manager"], ready: false },
];

export function reportsForRole(role: string): ReportDef[] {
  return REPORTS.filter((r) => r.ready && r.roles.includes(role));
}

export function discountCap(role: string): number {
  return DISCOUNT_CAPS[role] ?? 0;
}

export function isOverCap(role: string, pct: number): boolean {
  return pct > discountCap(role);
}

/** Money in Indian grouping, no decimals: 186400 -> ₹1,86,400. */
export function inr(n: number): string {
  const neg = n < 0;
  let s = Math.round(Math.abs(n)).toString();
  if (s.length > 3) s = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + s.slice(-3);
  return `${neg ? "-" : ""}₹${s}`;
}

// ---------------------------------------------------------------- dates (YYYY-MM-DD, no time zones)

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function utc(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function addDays(d: string, n: number): string {
  return new Date(utc(d) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / DAY_MS);
}

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

export function isDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(utc(s));
}

/** 2026-11-02 -> 02 Nov 2026 */
export function fmtDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return `${String(day).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

// ---------------------------------------------------------------- seeded randomness

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, list: T[]): T {
  return list[Math.floor(r() * list.length) % list.length];
}

const FIRST = ["Ravi", "Meena", "Arun", "Karthik", "Sanjay", "Divya", "Lakshmi", "Vignesh", "Farhan", "Priya", "Suresh", "Anand", "Deepa", "Harish", "Nithya", "Prakash", "Revathi", "Gokul", "Saranya", "Mohan", "Kavitha", "Balaji", "Janani", "Ashok", "Uma", "Rahul", "Swetha", "Naveen", "Pooja", "Imran"];
const LAST = ["Shankar", "Iyer", "Prakash", "Raja", "Rao", "S", "N", "M", "Ahmed", "K", "B", "T", "Menon", "Nair", "Reddy", "Kumar", "Pillai", "Subramanian", "R", "V"];
const CARS = [
  "Maruti · Swift", "Maruti · Baleno", "Maruti · Dzire", "Maruti · Ertiga", "Hyundai · Creta", "Hyundai · i20", "Hyundai · Verna", "Hyundai · Venue",
  "Toyota · Innova", "Toyota · Fortuner", "Honda · City", "Honda · Amaze", "Tata · Nexon", "Tata · Punch", "Kia · Seltos", "Kia · Sonet",
  "Mahindra · XUV700", "Mahindra · Thar", "Skoda · Slavia", "Renault · Kiger", "Volkswagen · Virtus", "MG · Hector",
];
// A fixed set of vehicles that come back to the centres again and again. Every receipt
// belongs to one of them, so Vehicle search and the receipts always agree.
interface RegVehicle {
  plate: string;
  makeModel: string | null;
  owner: string;
  phone: string; // 10 digits
}
const REGISTRY_SIZE = 1400;
let registry: RegVehicle[] | null = null;
function getRegistry(): RegVehicle[] {
  if (registry) return registry;
  const r = rng("vehicle-registry");
  const list: RegVehicle[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < REGISTRY_SIZE; i++) {
    let plate = makePlate(r);
    while (seen.has(plate)) plate = makePlate(r);
    seen.add(plate);
    const makeModel = r() > 0.04 ? pick(r, CARS) : null;
    // every seventh vehicle is the second car of the previous owner (same phone)
    if (i % 7 === 1 && list.length) {
      const prev = list[i - 1];
      list.push({ plate, makeModel, owner: prev.owner, phone: prev.phone });
    } else {
      const phone = `${pick(r, ["9", "8", "7", "6"])}${String(Math.floor(r() * 1e9)).padStart(9, "0")}`;
      list.push({ plate, makeModel, owner: `${pick(r, FIRST)} ${pick(r, LAST)}`, phone });
    }
  }
  registry = list;
  return list;
}
/** Which vehicle a given receipt number belongs to (a few come back often). */
function vehicleForReceipt(no: number): RegVehicle {
  const reg = getRegistry();
  const x = rng(`v|${no}`)();
  return reg[Math.floor(Math.pow(x, 1.35) * reg.length) % reg.length];
}
const maskPhone = (phone: string) => `+91 XXXXX X${phone.slice(-4)}`;
const normPlate = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

const RTO = ["01", "02", "05", "06", "07", "09", "10", "11", "12", "14", "18", "22", "33", "38"];
const SERIES = "ABCDEFGHJKLMNPRSTUVWXYZ";

function makePlate(r: () => number): string {
  const l = () => SERIES[Math.floor(r() * SERIES.length)];
  return `TN ${pick(r, RTO)} ${l()}${l()} ${String(1000 + Math.floor(r() * 9000))}`;
}

// People who approve discounts at each centre. The Owner can approve at any centre.
const OWNER_NAME = "Rajesh Sharma";
const SUPERVISORS: Record<string, string> = {
  "service-a": "Ramesh S.",
  "service-b": "Karthik Raja",
  "wash-1": "Anitha P.",
  "wash-2": "Dinesh K.",
  "wash-3": "Mohan V.",
};
const MANAGERS: Record<string, { name: string; role: string }> = {
  "service-a": { name: "Vignesh Admin", role: "Admin" },
  "service-b": { name: "Priya Narayanan", role: "Manager" },
  "wash-1": { name: "Sundar M.", role: "Manager" },
  "wash-2": { name: "Latha R.", role: "Manager" },
  "wash-3": { name: "Irfan A.", role: "Manager" },
};

// Cash share of today's collection per centre, and what Accounts has counted so far.
// Service A matches the specification's mock-up: ₹1,86,400 = ₹1,52,000 Pine Labs + ₹34,400 cash.
const TODAY_CASH: Record<string, number> = { "service-a": 34400, "service-b": 22400, "wash-1": 7500, "wash-2": 6250, "wash-3": 7250 };
const TODAY_COUNTED: Record<string, number> = { "service-a": 34000, "service-b": 22400, "wash-1": 7000, "wash-3": 7250 };

const RECEIPT_BASE = 1000;
const EPOCH = "2026-10-01"; // receipt numbers count from here
const SERVICE_BLOCK = 20;
const WASH_BLOCK = 60;

// ---------------------------------------------------------------- the ledger

export function createLedger(seed: LedgerSeed, deps: LedgerDeps) {
  const centreById = new Map(seed.centres.map((c) => [c.id, c]));
  const allIds = seed.centres.map((c) => c.id);
  const blockSize = (c: LedgerCentre) => (c.type === "service" ? SERVICE_BLOCK : WASH_BLOCK);
  const blockStart: Record<string, number> = {};
  const dayBlock = seed.centres.reduce((acc, c) => {
    blockStart[c.id] = acc;
    return acc + blockSize(c);
  }, 0);
  const todayRow = (id: string) => seed.todaySummaries.find((s) => s.centreId === id);
  const avgTicket = (id: string) => {
    const t = todayRow(id);
    const n = t ? Math.max(1, t.vehiclesIn - t.pendingUnbilled) : 1;
    return t ? t.collection / n : 500;
  };
  const chartAvg = (id: string) => {
    const vals = seed.chart.map((d) => d.centres[id] ?? 0).filter((v) => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : todayRow(id)?.collection ?? 0;
  };

  // ------------------------------------------------ access

  function requireView(user: AcctUser) {
    if (!VIEW_ROLES.includes(user.role)) throw new AccountsError("no-access", "You don't have access to this");
  }

  function requireEdit(user: AcctUser) {
    if (!EDIT_ROLES.includes(user.role)) throw new AccountsError("no-access", "Only Accounts and Owner can change this");
  }

  /** Centre ids this user may see for money screens. */
  function allowedCentres(user: AcctUser): string[] {
    if (ALL_CENTRE_ROLES.includes(user.role)) return allIds;
    return allIds.filter((id) => id === user.centreId);
  }

  /** Resolve a centre filter ("all" or one id) into the ids the user is allowed to see. */
  function resolveScope(user: AcctUser, centreId: string, roles: string[]): string[] {
    if (!roles.includes(user.role)) throw new AccountsError("no-access", "You don't have access to this");
    const allowed = allowedCentres(user);
    if (centreId === "all") return allowed;
    if (!allowed.includes(centreId)) throw new AccountsError("no-access", "You don't have access to this centre");
    return [centreId];
  }

  function checkDate(d: string) {
    if (!isDate(d)) throw new AccountsError("invalid", "Choose a valid date");
  }

  // ------------------------------------------------ one centre, one day

  interface DayModel {
    receipts: Receipt[];
    pending: number;
    vehiclesIn: number;
  }
  const cache = new Map<string, DayModel>();

  function targets(date: string, id: string): { total: number; cash: number; n: number; pending: number } {
    const c = centreById.get(id)!;
    const r = rng(`t|${date}|${id}`);
    if (date === seed.today && todayRow(id)) {
      const t = todayRow(id)!;
      const total = t.collection;
      const cash = TODAY_CASH[id] !== undefined && TODAY_CASH[id] < total ? TODAY_CASH[id] : Math.round((total * (c.type === "service" ? 0.18 : 0.4)) / 10) * 10;
      return { total, cash, n: Math.max(2, t.vehiclesIn - t.pendingUnbilled), pending: t.pendingUnbilled };
    }
    const charted = seed.chart.find((d) => d.dateStr === date)?.centres[id];
    const total = charted !== undefined ? charted : Math.round((chartAvg(id) * (0.85 + r() * 0.3)) / 50) * 50;
    const share = (c.type === "service" ? 0.14 : 0.36) + r() * 0.1;
    const cash = Math.round((total * share) / 10) * 10;
    return { total, cash, n: Math.max(4, Math.round(total / avgTicket(id))), pending: 0 };
  }

  /** Split `total` into `n` whole-rupee amounts that add up exactly. */
  function split(total: number, n: number, r: () => number): number[] {
    if (n <= 0 || total <= 0) return [];
    if (n === 1) return [total];
    const w = Array.from({ length: n }, () => 0.5 + r() * 1.4);
    const sw = w.reduce((a, b) => a + b, 0);
    const out = w.map((x) => Math.max(10, Math.round((total * x) / sw / 10) * 10));
    let sum = out.slice(0, n - 1).reduce((a, b) => a + b, 0);
    // make sure the last one is a sensible size
    while (total - sum < (total / n) * 0.35) {
      let big = 0;
      for (let i = 1; i < n - 1; i++) if (out[i] > out[big]) big = i;
      if (out[big] <= 20) break;
      out[big] -= 10;
      sum -= 10;
    }
    out[n - 1] = total - sum;
    return out;
  }

  function dayModel(date: string, id: string): DayModel {
    const key = `${date}|${id}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const c = centreById.get(id);
    if (!c || date > seed.today || date < EPOCH) {
      const empty = { receipts: [], pending: 0, vehiclesIn: 0 };
      cache.set(key, empty);
      return empty;
    }
    const r = rng(`d|${date}|${id}`);
    const t = targets(date, id);
    const dayIdx = daysBetween(EPOCH, date);
    const cap = blockSize(c);
    const n = Math.min(t.n, cap);

    const pineTotal = t.total - t.cash;
    let nCash = t.cash > 0 ? Math.max(1, Math.min(n - 1, Math.round(n * (t.cash / t.total) * 1.3))) : 0;
    if (pineTotal <= 0) nCash = n;
    const nPine = n - nCash;
    const cashAmts = split(t.cash, nCash, r);
    const pineAmts = split(pineTotal, nPine, r);

    const modes: PayMode[] = [...cashAmts.map(() => "Cash" as PayMode), ...pineAmts.map(() => "Pine Labs" as PayMode)];
    const amounts = [...cashAmts, ...pineAmts];
    const order = modes.map((_, i) => i).sort(() => r() - 0.5);
    const mins = Array.from({ length: n }, () => 510 + Math.floor(r() * 560)).sort((a, b) => a - b);

    const receipts: Receipt[] = order.map((src, i) => {
      const no = RECEIPT_BASE + dayIdx * dayBlock + blockStart[id] + i;
      const rr = rng(`r|${no}`);
      const makeKnown = rr() > 0.04;
      const base: Receipt = {
        id: `RCT-${no}`,
        no,
        date,
        time: `${String(Math.floor(mins[i] / 60)).padStart(2, "0")}:${String(mins[i] % 60).padStart(2, "0")}`,
        centreId: id,
        centreName: c.name,
        customer: `${pick(rr, FIRST)} ${pick(rr, LAST)}`,
        plate: makePlate(rr),
        makeModel: makeKnown ? pick(rr, CARS) : null,
        mode: modes[src],
        amount: amounts[src],
        settled: true,
        inCount: true,
        lateSync: false,
        invoiceNo: `INV-${String(no).padStart(4, "0")}`,
        discountPct: 0,
        discountBy: null,
        discountRole: null,
      };
      const veh = vehicleForReceipt(no);
      base.customer = veh.owner;
      base.plate = veh.plate;
      base.makeModel = veh.makeModel;
      // a few bills carry a discount, always inside the approver's cap
      if (rr() < (c.type === "service" ? 0.2 : 0.05)) {
        const who = rr();
        if (who < 0.55) {
          base.discountPct = 5;
          base.discountBy = SUPERVISORS[id] ?? "Supervisor";
          base.discountRole = "Supervisor";
        } else if (who < 0.85) {
          const m = MANAGERS[id] ?? { name: "Manager", role: "Manager" };
          base.discountPct = rr() < 0.6 ? 5 : 10;
          base.discountBy = m.name;
          base.discountRole = m.role;
        } else {
          base.discountPct = pick(rr, [5, 10, 15]);
          base.discountBy = OWNER_NAME;
          base.discountRole = "Owner";
        }
      }
      return base;
    });

    // one thing to look at per centre-day: today it is fixed, other days it is occasional
    const flag = (kind: "late" | "unsettled" | "notInCount", idx: number) => {
      const rec = receipts[idx];
      if (!rec) return;
      if (kind === "late") rec.lateSync = true;
      if (kind === "unsettled" && rec.mode === "Pine Labs") rec.settled = false;
      if (kind === "notInCount" && rec.mode === "Cash") rec.inCount = false;
    };
    if (date === seed.today) {
      if (id === "service-b") flag("late", Math.min(4, receipts.length - 1));
      if (id === "wash-2") flag("notInCount", receipts.findIndex((x, i) => i >= 3 && x.mode === "Cash"));
      if (id === "wash-3") flag("unsettled", receipts.findIndex((x, i) => i >= 2 && x.mode === "Pine Labs"));
    } else if (r() < 0.2 && receipts.length > 3) {
      const idx = 2 + Math.floor(r() * (receipts.length - 3));
      const kind = receipts[idx].mode === "Cash" ? "notInCount" : r() < 0.5 ? "unsettled" : "late";
      flag(kind, idx);
    }

    // the two discounts the dashboard alert talks about
    if (date === seed.today && id === "service-b" && receipts.length >= 4) {
      Object.assign(receipts[2], { invoiceNo: "INV-0877", discountPct: 15, discountBy: OWNER_NAME, discountRole: "Owner", time: "10:41" });
      Object.assign(receipts[3], { invoiceNo: "INV-0101", discountPct: 5, discountBy: "Karthik Raja", discountRole: "Supervisor", time: "10:42" });
      receipts.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : a.no - b.no));
    }

    const model = { receipts, pending: t.pending, vehiclesIn: receipts.length + t.pending };
    cache.set(key, model);
    return model;
  }

  const statusOf = (r: Receipt): ReceiptStatus => {
    if (r.lateSync) return "Late sync";
    if (r.mode === "Pine Labs") return r.settled ? "Matched" : "Not settled";
    return r.inCount ? "Matched" : "Not in cash count";
  };

  const cashExpected = (m: DayModel) => m.receipts.filter((r) => r.mode === "Cash" && r.inCount).reduce((a, r) => a + r.amount, 0);

  // ------------------------------------------------ saved state per centre-day

  function seedState(date: string, id: string): DayState {
    const m = dayModel(date, id);
    if (date === seed.today) {
      return { cashCounted: TODAY_COUNTED[id] !== undefined ? TODAY_COUNTED[id] : id === "wash-2" ? cashExpected(m) : undefined, notes: {} };
    }
    // earlier days are closed, with a note against every difference
    const r = rng(`s|${date}|${id}`);
    const expected = cashExpected(m);
    const short = r() < 0.12 ? 100 * (1 + Math.floor(r() * 4)) : 0;
    const notes: Record<string, string> = {};
    for (const rec of m.receipts) {
      const s = statusOf(rec);
      if (s === "Not settled") notes[rec.id] = "Came in with the next Pine Labs settlement.";
      if (s === "Not in cash count") notes[rec.id] = "Cash handed over the next morning.";
      if (s === "Late sync") notes[rec.id] = "Tablet was offline; bill synced after closing time.";
    }
    if (short) notes.cash = "Counted twice; difference carried to the next day's float.";
    return {
      cashCounted: m.receipts.some((x) => x.mode === "Cash") ? expected - short : undefined,
      notes,
      closed: { by: "Meena R.", role: "Accounts", at: utc(date) + (18 * 60 + 40) * 60_000 - 330 * 60_000 },
    };
  }

  const stateOf = (date: string, id: string): DayState => deps.store.get(date, id) ?? seedState(date, id);

  function differencesOf(date: string, id: string, st: DayState): Difference[] {
    const m = dayModel(date, id);
    const out: Difference[] = m.receipts
      .filter((r) => statusOf(r) !== "Matched")
      .map((r) => ({ key: r.id, label: `${r.id} · ${statusOf(r)}`, note: st.notes[r.id] ?? null }));
    if (st.cashCounted !== undefined && st.cashCounted !== cashExpected(m)) {
      const d = st.cashCounted - cashExpected(m);
      out.push({ key: "cash", label: `Cash ${d < 0 ? "short" : "extra"} ${inr(Math.abs(d))}`, note: st.notes.cash ?? null });
    }
    return out;
  }

  // ------------------------------------------------ W5: reconciliation

  function getReconciliation(user: AcctUser, q: { date: string; centreId: string }): Reconciliation {
    requireView(user);
    checkDate(q.date);
    const ids = resolveScope(user, q.centreId, VIEW_ROLES);
    const single = q.centreId !== "all" && ids.length === 1 ? ids[0] : null;

    const receipts: ReceiptRow[] = [];
    const centreStates: CentreState[] = [];
    let pineTotal = 0, pineSettled = 0, cashTotal = 0, expected = 0, counted = 0, centresCounted = 0;
    let differences: Difference[] = [];

    for (const id of ids) {
      const m = dayModel(q.date, id);
      const st = stateOf(q.date, id);
      const diffs = differencesOf(q.date, id, st);
      if (single) differences = diffs;
      for (const r of m.receipts) {
        receipts.push({ ...r, status: statusOf(r), note: st.notes[r.id] ?? null });
        if (r.mode === "Pine Labs") {
          pineTotal += r.amount;
          if (r.settled) pineSettled += r.amount;
        } else cashTotal += r.amount;
      }
      expected += cashExpected(m);
      const hasCash = m.receipts.some((r) => r.mode === "Cash");
      if (st.cashCounted !== undefined) {
        counted += st.cashCounted;
        centresCounted += 1;
      } else if (!hasCash) centresCounted += 1;
      centreStates.push({
        centreId: id,
        centreName: centreById.get(id)!.name,
        closed: !!st.closed,
        differences: diffs.length,
        missingNotes: diffs.filter((d) => !d.note).length,
        cashCounted: st.cashCounted ?? null,
      });
    }

    const allCounted = centresCounted === ids.length;
    const anyCounted = ids.some((id) => stateOf(q.date, id).cashCounted !== undefined);
    const st1 = single ? stateOf(q.date, single) : null;
    const missing = single ? differences.filter((d) => !d.note).length : centreStates.reduce((a, c) => a + c.missingNotes, 0);
    const isClosed = !!st1?.closed;
    const canEdit = !!single && EDIT_ROLES.includes(user.role) && !isClosed && q.date <= seed.today;

    const blockers: string[] = [];
    if (single && !isClosed) {
      const hasCash = dayModel(q.date, single).receipts.some((r) => r.mode === "Cash");
      if (hasCash && st1!.cashCounted === undefined) blockers.push("Enter the cash counted");
      if (missing > 0) blockers.push(`Add a note to ${missing} difference${missing === 1 ? "" : "s"}`);
    }

    return {
      date: q.date,
      centreId: q.centreId,
      receipts: receipts.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : a.no - b.no)),
      summary: {
        receiptsTotal: pineTotal + cashTotal,
        receiptsCount: receipts.length,
        pineTotal,
        pineSettled,
        pineUnsettled: pineTotal - pineSettled,
        cashTotal,
        cashExpected: expected,
        cashCounted: anyCounted ? counted : null,
        cashDiff: anyCounted && allCounted ? counted - expected : null,
        centresCounted,
        centresTotal: ids.length,
      },
      differences,
      missingNotes: missing,
      closed: st1?.closed ?? null,
      centreStates,
      canEdit,
      canClose: !!single && EDIT_ROLES.includes(user.role) && !isClosed && q.date <= seed.today,
      blockers,
    };
  }

  function editTarget(user: AcctUser, date: string, centreId: string) {
    requireView(user);
    requireEdit(user);
    checkDate(date);
    if (date > seed.today) throw new AccountsError("invalid", "That day has not happened yet");
    const [id] = resolveScope(user, centreId, EDIT_ROLES);
    if (centreId === "all") throw new AccountsError("invalid", "Choose one centre");
    const st = stateOf(date, id);
    if (st.closed) throw new AccountsError("closed", "This day is closed and can't be changed");
    return { id, st: { ...st, notes: { ...st.notes } }, name: centreById.get(id)!.name };
  }

  const audit = (user: AcctUser, centre: string, action: string, record: string, before: string, after: string) =>
    deps.audit?.({ user: user.name, role: user.role, centre, action, record, before, after });

  function setCashCounted(user: AcctUser, q: { date: string; centreId: string; amount: number }) {
    const { id, st, name } = editTarget(user, q.date, q.centreId);
    if (!Number.isInteger(q.amount) || q.amount < 0 || q.amount > 10_000_000) throw new AccountsError("invalid", "Enter the cash counted as a whole number of rupees");
    const before = st.cashCounted === undefined ? "Not entered" : inr(st.cashCounted);
    st.cashCounted = q.amount;
    deps.store.set(q.date, id, st);
    audit(user, name, "Cash counted entered", `${name} · ${fmtDate(q.date)}`, before, inr(q.amount));
  }

  function setNote(user: AcctUser, q: { date: string; centreId: string; key: string; note: string }) {
    const { id, st, name } = editTarget(user, q.date, q.centreId);
    const note = (q.note ?? "").trim();
    if (!note) throw new AccountsError("invalid", "Write a short explanation");
    if (note.length > 300) throw new AccountsError("invalid", "Keep the explanation under 300 characters");
    const diff = differencesOf(q.date, id, st).find((d) => d.key === q.key);
    if (!diff) throw new AccountsError("invalid", "There is no difference to explain here");
    const before = st.notes[q.key] ?? "No note";
    st.notes[q.key] = note;
    deps.store.set(q.date, id, st);
    audit(user, name, "Difference explained", q.key === "cash" ? `Cash count · ${name} · ${fmtDate(q.date)}` : `${q.key} · ${name}`, before, note);
  }

  function closeDay(user: AcctUser, q: { date: string; centreId: string }) {
    const { id, st, name } = editTarget(user, q.date, q.centreId);
    const m = dayModel(q.date, id);
    if (m.receipts.some((r) => r.mode === "Cash") && st.cashCounted === undefined) throw new AccountsError("not-ready", "Enter the cash counted first");
    const diffs = differencesOf(q.date, id, st);
    const missing = diffs.filter((d) => !d.note).length;
    if (missing) throw new AccountsError("not-ready", `Add a note to ${missing} difference${missing === 1 ? "" : "s"} first`);
    st.closed = { by: user.name, role: user.role, at: (deps.now ?? Date.now)() };
    deps.store.set(q.date, id, st);
    audit(user, name, "Day closed", `${name} · ${fmtDate(q.date)}`, "Open", `Closed · ${diffs.length} difference${diffs.length === 1 ? "" : "s"} explained`);
  }

  // ------------------------------------------------ bills

  function parseReceiptId(rid: string): { date: string; centreId: string; index: number } | null {
    const m = /^RCT-(\d+)$/.exec(rid);
    if (!m || dayBlock === 0) return null;
    const rel = Number(m[1]) - RECEIPT_BASE;
    if (rel < 0) return null;
    const dayIdx = Math.floor(rel / dayBlock);
    const within = rel % dayBlock;
    const c = seed.centres.find((x) => within >= blockStart[x.id] && within < blockStart[x.id] + blockSize(x));
    if (!c) return null;
    return { date: addDays(EPOCH, dayIdx), centreId: c.id, index: within - blockStart[c.id] };
  }

  function findReceipt(rid: string): Receipt | null {
    const p = parseReceiptId(rid);
    if (!p) return null;
    return dayModel(p.date, p.centreId).receipts.find((r) => r.id === rid) ?? null;
  }

  const SERVICE_LINES = [
    ["General service labour", 0.35], ["Engine oil 3.5 L (Brand A, OEM)", 0.22], ["Oil filter (Brand A, OEM)", 0.08], ["Brake pads (Brand B, Aftermarket)", 0.2],
    ["Wheel alignment and balancing", 0.12], ["AC gas top-up", 0.15], ["Air filter (Brand C, Aftermarket)", 0.06],
  ] as const;
  const WASH_LINES = [["Foam wash", 0.6], ["Interior vacuum", 0.2], ["Underbody wash", 0.25], ["Wax polish", 0.3], ["Tyre dressing", 0.1]] as const;

  /** Rupees as paise-exact numbers. */
  const r2 = (n: number) => Math.round(n * 100) / 100;

  function getBill(user: AcctUser, receiptId: string): Bill {
    requireView(user);
    const rec = findReceipt(receiptId);
    if (!rec) throw new AccountsError("invalid", "That bill was not found");
    if (!allowedCentres(user).includes(rec.centreId)) throw new AccountsError("no-access", "You don't have access to this bill");

    const c = centreById.get(rec.centreId)!;
    const r = rng(`bill|${rec.no}`);
    const totalP = rec.amount * 100;
    const taxableP = Math.round(totalP / (1 + GST_PCT / 100));
    const grossP = rec.discountPct ? Math.round(taxableP / (1 - rec.discountPct / 100)) : taxableP;
    const discP = grossP - taxableP;

    // split the pre-discount amount into a few lines that add up exactly
    const pool = (c.type === "service" ? SERVICE_LINES : WASH_LINES).slice().sort(() => r() - 0.5);
    const k = Math.min(pool.length, c.type === "service" ? 3 + Math.floor(r() * 3) : 1 + Math.floor(r() * 3));
    const chosen = pool.slice(0, k);
    const wsum = chosen.reduce((a, x) => a + x[1], 0);
    let left = grossP;
    const raw = chosen.map((x, i) => {
      const p = i === k - 1 ? left : Math.round((grossP * x[1]) / wsum);
      left -= p;
      const qty = c.type === "service" && /oil|filter|pads/i.test(x[0]) ? 1 + Math.floor(r() * 3) : 1;
      return { desc: x[0], qty, p };
    });
    // make quantity x rate come out exact, and give any spare paise to a single-quantity line
    let spare = 0;
    const parts = raw.map((l) => {
      if (l.qty > 1) {
        const rateP = Math.floor(l.p / l.qty);
        spare += l.p - rateP * l.qty;
        return { desc: l.desc, qty: l.qty, rateP, amountP: rateP * l.qty };
      }
      return { desc: l.desc, qty: 1, rateP: l.p, amountP: l.p };
    });
    if (spare) {
      let t = [...parts].reverse().find((l) => l.qty === 1);
      if (!t) {
        t = parts[parts.length - 1];
        t.qty = 1;
        t.rateP = t.amountP;
      }
      t.rateP += spare;
      t.amountP += spare;
    }
    const lines: BillLine[] = parts.map((l) => ({ desc: l.desc, qty: l.qty, rate: l.rateP / 100, amount: l.amountP / 100 }));

    const t = (n: number) => new Date(`${rec.date}T${rec.time}:00Z`).getTime() + n * 60_000;
    const gate = new Date(t(8 + Math.floor(r() * 20)));
    return {
      receiptId: rec.id,
      invoiceNo: rec.invoiceNo,
      date: rec.date,
      time: rec.time,
      centreName: rec.centreName,
      customer: rec.customer,
      plate: rec.plate,
      makeModel: rec.makeModel,
      lines,
      subtotal: grossP / 100,
      discountPct: rec.discountPct,
      discountValue: discP / 100,
      discountBy: rec.discountBy,
      discountRole: rec.discountRole,
      taxable: taxableP / 100,
      gstPct: GST_PCT,
      gst: (totalP - taxableP) / 100,
      total: rec.amount,
      mode: rec.mode,
      pineRef: rec.mode === "Pine Labs" ? `PL${String(100000000 + Math.floor(r() * 899999999))}` : null,
      passNo: `PASS-${String(rec.no % 10000).padStart(4, "0")}`,
      gateTime: `${String(gate.getUTCHours()).padStart(2, "0")}:${String(gate.getUTCMinutes()).padStart(2, "0")}`,
      status: statusOf(rec),
    };
  }

  // ------------------------------------------------ W6: discounts

  function getDiscounts(user: AcctUser, q: { from: string; to: string; centreId: string; approver: string }): DiscountReport {
    requireView(user);
    checkDate(q.from);
    checkDate(q.to);
    if (q.from > q.to) throw new AccountsError("invalid", "The start date is after the end date");
    const ids = resolveScope(user, q.centreId, VIEW_ROLES);
    const rows: DiscountRow[] = [];
    for (const date of eachDate(q.from, q.to < seed.today ? q.to : seed.today)) {
      for (const id of ids) {
        for (const r of dayModel(date, id).receipts) {
          if (!r.discountPct) continue;
          const bill = getBillValue(r);
          rows.push({
            receiptId: r.id,
            date: r.date,
            time: r.time,
            centreId: r.centreId,
            centreName: r.centreName,
            invoiceNo: r.invoiceNo,
            plate: r.plate,
            makeModel: r.makeModel,
            pct: r.discountPct,
            value: bill,
            approvedBy: r.discountBy ?? "",
            role: r.discountRole ?? "",
            cap: discountCap(r.discountRole ?? ""),
            overCap: isOverCap(r.discountRole ?? "", r.discountPct),
          });
        }
      }
    }
    rows.sort((a, b) => (a.date === b.date ? (a.time < b.time ? 1 : -1) : a.date < b.date ? 1 : -1));
    const approvers = [...new Set(rows.map((r) => r.approvedBy))].sort();
    const shown = q.approver && q.approver !== "all" ? rows.filter((r) => r.approvedBy === q.approver) : rows;
    return {
      rows: shown,
      approvers,
      summary: {
        count: shown.length,
        value: r2(shown.reduce((a, r) => a + r.value, 0)),
        atTopTier: shown.filter((r) => r.pct >= TOP_DISCOUNT_TIER).length,
        overCap: shown.filter((r) => r.overCap).length,
      },
    };
  }

  /** The discount value in rupees for one receipt. */
  function getBillValue(r: Receipt): number {
    const totalP = r.amount * 100;
    const taxableP = Math.round(totalP / (1 + GST_PCT / 100));
    const grossP = r.discountPct ? Math.round(taxableP / (1 - r.discountPct / 100)) : taxableP;
    return (grossP - taxableP) / 100;
  }

  // ------------------------------------------------ W12: money reports

  function reportCentres(user: AcctUser, def: ReportDef, centreId: string): string[] {
    if (!def.roles.includes(user.role)) throw new AccountsError("no-access", "You don't have access to this report");
    const allowed = ALL_CENTRE_ROLES.includes(user.role) ? allIds : allIds.filter((id) => id === user.centreId);
    if (centreId === "all") return allowed;
    if (!allowed.includes(centreId)) throw new AccountsError("no-access", "You don't have access to this centre");
    return [centreId];
  }

  function centreLabel(ids: string[], centreId: string): string {
    return centreId === "all" && ids.length > 1 ? "All centres" : ids.length === 1 ? centreById.get(ids[0])!.name : "All centres";
  }

  function rangeLabel(from: string, to: string): string {
    return from === to ? fmtDate(from) : `${fmtDate(from)} to ${fmtDate(to)}`;
  }

  function buildReport(user: AcctUser, q: { report: string; from: string; to: string; centreId: string }): ReportResult {
    const def = REPORTS.find((r) => r.id === q.report && r.ready);
    if (!def) throw new AccountsError("invalid", "That report is not available");
    checkDate(q.from);
    checkDate(q.to);
    if (q.from > q.to) throw new AccountsError("invalid", "The start date is after the end date");
    const ids = reportCentres(user, def, q.centreId);
    const dates = eachDate(q.from, q.to < seed.today ? q.to : seed.today);
    const subtitle = `Dev Ventures · ${centreLabel(ids, q.centreId)} · ${rangeLabel(q.from, q.to)}`;
    const base = { id: def.id, subtitle, note: null as string | null };

    if (def.id === "daily-collection") {
      const rows = ids.map((id) => {
        let vehicles = 0, pine = 0, cash = 0;
        for (const d of dates) {
          const m = dayModel(d, id);
          vehicles += m.vehiclesIn;
          for (const r of m.receipts) (r.mode === "Pine Labs" ? (pine += r.amount) : (cash += r.amount));
        }
        return { centre: centreById.get(id)!.name, vehicles, pine, cash, total: pine + cash } as Record<string, ReportCell>;
      });
      return {
        ...base,
        title: "Daily collection report",
        columns: [
          { key: "centre", label: "Centre" },
          { key: "vehicles", label: "Vehicles", align: "right", kind: "int" },
          { key: "pine", label: "Pine Labs", align: "right", kind: "money" },
          { key: "cash", label: "Cash", align: "right", kind: "money" },
          { key: "total", label: "Total", align: "right", kind: "money" },
        ],
        rows,
        totals: sumRow(rows, "Total", ["vehicles", "pine", "cash", "total"]),
      };
    }

    if (def.id === "discounts") {
      const d = getDiscounts(user, { from: q.from, to: q.to, centreId: q.centreId, approver: "all" });
      const rows = d.rows.map((r) => ({
        date: `${fmtDate(r.date)} ${r.time}`,
        centre: r.centreName,
        invoice: r.invoiceNo,
        plate: `${r.plate}\n${r.makeModel ?? "Details pending"}`,
        pct: r.pct,
        value: r.value,
        by: r.approvedBy,
        role: r.role,
      })) as Record<string, ReportCell>[];
      return {
        ...base,
        title: "Discounts report",
        columns: [
          { key: "date", label: "Date · time" },
          { key: "centre", label: "Centre" },
          { key: "invoice", label: "Invoice" },
          { key: "plate", label: "Car number", kind: "plate" },
          { key: "pct", label: "%", align: "right", kind: "pct" },
          { key: "value", label: "Value", align: "right", kind: "money" },
          { key: "by", label: "Approved by" },
          { key: "role", label: "Role" },
        ],
        rows,
        totals: { date: "Total", value: d.summary.value, pct: null, centre: null, invoice: null, plate: null, by: `${d.summary.count} discounts`, role: null },
      };
    }

    // The membership report reads from membership plans (W11), which is another screen.
    // Until that is connected it shows sample figures.
    const sample = "Sample figures until this report is connected to its source screen.";
    if (def.id === "membership") {
      const plans = [["Wash Club · 4 washes", 1499], ["Wash Club · 12 washes", 3999], ["Service Care Plan", 6999]] as const;
      const rows: Record<string, ReportCell>[] = [];
      for (const id of ids) {
        const c = centreById.get(id)!;
        for (const [pi, [name, price]] of plans.entries()) {
          if (c.type === "washing" && pi === 2) continue;
          if (c.type === "service" && pi === 1) continue;
          let sold = 0;
          for (const d of dates) sold += Math.floor(rng(`m|${d}|${id}|${pi}`)() * 3);
          rows.push({ centre: c.name, plan: name, sold, value: sold * price });
        }
      }
      return {
        ...base,
        title: "Membership report",
        note: sample,
        columns: [
          { key: "centre", label: "Centre" },
          { key: "plan", label: "Plan" },
          { key: "sold", label: "Sold", align: "right", kind: "int" },
          { key: "value", label: "Value", align: "right", kind: "money" },
        ],
        rows,
        totals: sumRow(rows, "Total", ["sold", "value"]),
      };
    }

    const bought = allPurchases().filter((e) => ids.includes(e.centreId) && e.date >= q.from && e.date <= dates[dates.length - 1]);
    const rows = ids.map((id) => {
      const t = totalsOf(bought.filter((e) => e.centreId === id));
      return { centre: centreById.get(id)!.name, bills: t.count, parts: t.amount, gst: t.gst, total: t.total } as Record<string, ReportCell>;
    });
    return {
      ...base,
      title: "Purchase & parts cost report",
      columns: [
        { key: "centre", label: "Centre" },
        { key: "bills", label: "Purchase bills", align: "right", kind: "int" },
        { key: "parts", label: "Parts cost", align: "right", kind: "money" },
        { key: "gst", label: "GST", align: "right", kind: "money" },
        { key: "total", label: "Total", align: "right", kind: "money" },
      ],
      rows,
      totals: sumRow(rows, "Total", ["bills", "parts", "gst", "total"]),
    };
  }

  function sumRow(rows: Record<string, ReportCell>[], label: string, keys: string[]): Record<string, ReportCell> {
    const out: Record<string, ReportCell> = {};
    const first = Object.keys(rows[0] ?? { centre: "" })[0];
    out[first] = label;
    for (const k of keys) out[k] = rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return out;
  }

  // ------------------------------------------------ purchases (W14), kept per centre

  let seededPurchases: PurchaseEntry[] | null = null;
  const memoryPurchases: PurchaseEntry[] = [];
  const purchaseStore: PurchaseStore = deps.purchases ?? { added: () => memoryPurchases, add: (e) => void memoryPurchases.push(e) };

  /** The history before anyone typed anything: a few bills per centre, the same every time. */
  function seededHistory(): PurchaseEntry[] {
    if (seededPurchases) return seededPurchases;
    const out: PurchaseEntry[] = [];
    let n = 0;
    for (const date of eachDate(EPOCH, seed.today)) {
      for (const id of allIds) {
        const c = centreById.get(id)!;
        const r = rng(`p|${date}|${id}`);
        if (r() >= (c.type === "service" ? 0.7 : 0.25)) continue;
        const cat = PURCHASE_CATALOG[c.type];
        const sup = PURCHASE_SUPPLIERS[c.type][Math.floor(r() * PURCHASE_SUPPLIERS[c.type].length)];
        const lines = c.type === "service" ? 1 + Math.floor(r() * 2) : 1;
        const billNo = `${sup.split(" ").map((w) => w[0]).join("")}-${1000 + Math.floor(r() * 9000)}`;
        for (let i = 0; i < lines; i++) {
          const it = cat[Math.floor(r() * cat.length)];
          const qty = c.type === "service" ? 2 + Math.floor(r() * 7) : 1 + Math.floor(r() * 4);
          const amount = qty * it.rate;
          const gst = Math.round((amount * GST_PCT) / 100);
          n += 1;
          out.push({
            id: `PUR-${String(n).padStart(4, "0")}`,
            date,
            centreId: id,
            centreName: c.name,
            supplier: sup,
            billNo,
            item: it.item,
            qty,
            rate: it.rate,
            amount,
            gst,
            total: amount + gst,
            addedBy: "Suresh P.",
            role: "Purchase",
          });
        }
      }
    }
    seededPurchases = out;
    return out;
  }

  const allPurchases = () => [...seededHistory(), ...purchaseStore.added()];

  function totalsOf(rows: PurchaseEntry[]): PurchaseTotals {
    const bills = new Set(rows.map((r) => `${r.supplier.toLowerCase()}|${r.billNo.toLowerCase()}|${r.centreId}`));
    return {
      count: bills.size,
      amount: rows.reduce((a, r) => a + r.amount, 0),
      gst: rows.reduce((a, r) => a + r.gst, 0),
      total: rows.reduce((a, r) => a + r.total, 0),
    };
  }

  function getPurchases(user: AcctUser, q: { from: string; to: string; centreId: string }): PurchaseReport {
    const ids = resolveScope(user, q.centreId, PURCHASE_VIEW_ROLES);
    checkDate(q.from);
    checkDate(q.to);
    if (q.from > q.to) throw new AccountsError("invalid", "The start date is after the end date");
    const rows = allPurchases()
      .filter((e) => ids.includes(e.centreId) && e.date >= q.from && e.date <= q.to)
      .sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
    return {
      rows,
      summary: totalsOf(rows),
      byCentre: ids.map((id) => ({ centreId: id, centreName: centreById.get(id)!.name, ...totalsOf(rows.filter((r) => r.centreId === id)) })),
      canAdd: PURCHASE_ADD_ROLES.includes(user.role),
    };
  }

  /** Centres this user can buy for: Purchase only their own, Owner any. */
  function purchaseCentres(user: AcctUser): { id: string; name: string; type: "service" | "washing" }[] {
    if (!PURCHASE_ADD_ROLES.includes(user.role)) return [];
    return allowedCentresForPurchase(user).map((id) => ({ id, name: centreById.get(id)!.name, type: centreById.get(id)!.type }));
  }
  function allowedCentresForPurchase(user: AcctUser): string[] {
    return user.role === "Owner" ? allIds : allIds.filter((id) => id === user.centreId);
  }

  function addPurchase(user: AcctUser, input: PurchaseInput): PurchaseEntry {
    if (!PURCHASE_ADD_ROLES.includes(user.role)) throw new AccountsError("no-access", "Only Purchase and Owner can add purchases");
    if (!allowedCentresForPurchase(user).includes(input.centreId)) throw new AccountsError("no-access", "You can only add purchases for your own centre");
    const centre = centreById.get(input.centreId)!;
    if (!isDate(input.date)) throw new AccountsError("invalid", "Choose a valid date");
    if (input.date > seed.today) throw new AccountsError("invalid", "The bill date can't be in the future");
    if (input.date < EPOCH) throw new AccountsError("invalid", `Bills before ${fmtDate(EPOCH)} can't be added here`);
    // late bills are normal, but old books shouldn't quietly change: Purchase can go back a week, the Owner any time
    if (user.role !== "Owner" && input.date < addDays(seed.today, -(PURCHASE_BACKDATE_DAYS - 1)))
      throw new AccountsError("invalid", `Bills older than ${PURCHASE_BACKDATE_DAYS} days can only be added by the Owner`);
    const supplier = (input.supplier ?? "").trim().replace(/\s+/g, " ");
    const billNo = (input.billNo ?? "").trim();
    const item = (input.item ?? "").trim().replace(/\s+/g, " ");
    if (supplier.length < 2 || supplier.length > 60) throw new AccountsError("invalid", "Enter the supplier's name");
    if (!billNo || billNo.length > 30) throw new AccountsError("invalid", "Enter the supplier's bill number");
    if (item.length < 2 || item.length > 80) throw new AccountsError("invalid", "Enter what was bought");
    if (!Number.isInteger(input.qty) || input.qty < 1 || input.qty > 1000) throw new AccountsError("invalid", "Quantity must be a whole number from 1 to 1000");
    if (!Number.isInteger(input.rate) || input.rate < 1 || input.rate > 1_000_000) throw new AccountsError("invalid", "Enter the price per item in whole rupees");
    // the same supplier bill can have several lines, but the same line can't be entered twice
    const dup = allPurchases().some(
      (e) => e.centreId === input.centreId && e.supplier.toLowerCase() === supplier.toLowerCase() && e.billNo.toLowerCase() === billNo.toLowerCase() && e.item.toLowerCase() === item.toLowerCase()
    );
    if (dup) throw new AccountsError("invalid", "This item is already entered on that bill");
    const other = allPurchases().find((e) => e.supplier.toLowerCase() === supplier.toLowerCase() && e.billNo.toLowerCase() === billNo.toLowerCase() && e.centreId !== input.centreId);
    if (other) throw new AccountsError("invalid", `Bill ${billNo} from ${supplier} is already entered for ${other.centreName}`);

    const amount = input.qty * input.rate;
    const gst = Math.round((amount * GST_PCT) / 100);
    const entry: PurchaseEntry = {
      id: `PUR-${String(allPurchases().length + 1).padStart(4, "0")}`,
      date: input.date,
      centreId: input.centreId,
      centreName: centre.name,
      supplier,
      billNo,
      item,
      qty: input.qty,
      rate: input.rate,
      amount,
      gst,
      total: amount + gst,
      addedBy: user.name,
      role: user.role,
    };
    purchaseStore.add(entry);
    audit(user, centre.name, "Purchase added", `${supplier} · bill ${billNo} · ${item}`, "—", `${input.qty} x ${inr(input.rate)} = ${inr(entry.total)} with GST`);
    return entry;
  }

  // ------------------------------------------------ helpers for screens

  /** Centres a user can pick in a filter. */
  function centresFor(user: AcctUser, roles: string[] = VIEW_ROLES): { id: string; name: string }[] {
    if (!roles.includes(user.role)) return [];
    return allowedCentres(user).map((id) => ({ id, name: centreById.get(id)!.name }));
  }

  // ------------------------------------------------ vehicle search (W3)

  let visitIndex: Map<string, Receipt[]> | null = null;
  function visitsByPlate(): Map<string, Receipt[]> {
    if (visitIndex) return visitIndex;
    const m = new Map<string, Receipt[]>();
    for (const date of eachDate(EPOCH, seed.today)) {
      for (const id of allIds) {
        for (const rec of dayModel(date, id).receipts) {
          const list = m.get(rec.plate);
          if (list) list.push(rec);
          else m.set(rec.plate, [rec]);
        }
      }
    }
    visitIndex = m;
    return m;
  }

  function requireVehicles(user: AcctUser) {
    if (!VEHICLE_ROLES.includes(user.role)) throw new AccountsError("no-access", "You don't have access to this");
  }

  /** Visits this user is allowed to see: Owner and Accounts all centres, Admin / Manager their own. */
  function visibleVisits(user: AcctUser, plate: string): Receipt[] {
    const ok = allowedCentres(user);
    return (visitsByPlate().get(plate) ?? []).filter((x) => ok.includes(x.centreId));
  }

  function summarise(user: AcctUser, v: RegVehicle): VehicleSummary | null {
    const vis = visibleVisits(user, v.plate);
    if (!vis.length) return null;
    const last = vis.reduce((a, b) => (a.date + a.time >= b.date + b.time ? a : b));
    return { plate: v.plate, makeModel: v.makeModel, owner: v.owner, phoneMasked: maskPhone(v.phone), visits: vis.length, lastDate: last.date, lastCentre: last.centreName };
  }

  function searchVehicles(user: AcctUser, query: string): VehicleSearchResult {
    requireVehicles(user);
    const q = query.trim();
    if (!q) return { query: q, kind: "plate", matches: [] };
    const reg = getRegistry();
    const digits = q.replace(/[\s+\-()]/g, "");
    const isPhone = /^\d{4,}$/.test(digits) && !/[A-Za-z]/.test(q);
    let found: RegVehicle[];
    if (isPhone) {
      const d = digits.replace(/^91(?=\d{10}$)/, "");
      found = reg.filter((v) => v.phone.includes(d));
    } else {
      const n = normPlate(q);
      found = n.length < 2 ? [] : reg.filter((v) => normPlate(v.plate).includes(n));
    }
    const matches = found.map((v) => summarise(user, v)).filter((x): x is VehicleSummary => !!x);
    // exact plate first, then most recent visit
    const n = normPlate(q);
    matches.sort((a, b) => Number(normPlate(b.plate) === n) - Number(normPlate(a.plate) === n) || (a.lastDate < b.lastDate ? 1 : -1));
    return { query: q, kind: isPhone ? "phone" : "plate", matches: matches.slice(0, 25) };
  }

  function getVehicle(user: AcctUser, plate: string): VehicleDetail {
    requireVehicles(user);
    const n = normPlate(plate);
    const v = getRegistry().find((x) => normPlate(x.plate) === n);
    const sum = v && summarise(user, v);
    if (!v || !sum) throw new AccountsError("invalid", "No vehicle found with that number");
    const vis = visibleVisits(user, v.plate).sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
    const others = getRegistry()
      .filter((x) => x.phone === v.phone && x.plate !== v.plate)
      .filter((x) => visibleVisits(user, x.plate).length > 0)
      .map((x) => ({ plate: x.plate, makeModel: x.makeModel }));
    return {
      ...sum,
      otherVehicles: others,
      history: vis.map((x) => ({
        receiptId: x.id,
        date: x.date,
        time: x.time,
        centreId: x.centreId,
        centreName: x.centreName,
        jobCard: `JC-${x.no}`,
        invoiceNo: x.invoiceNo,
        mode: x.mode,
        discountPct: x.discountPct,
        amount: x.amount,
      })),
      totalSpent: vis.reduce((a, x) => a + x.amount, 0),
      canSeePhotos: PHOTO_ROLES.includes(user.role),
    };
  }

  return {
    today: seed.today,
    centresFor,
    searchVehicles,
    getVehicle,
    getReconciliation,
    setCashCounted,
    setNote,
    closeDay,
    getBill,
    getDiscounts,
    getPurchases,
    addPurchase,
    purchaseCentres,
    buildReport,
    reportsForRole,
    /** Totals the dashboard should agree with. */
    dayTotal(date: string, centreId: string): number {
      return dayModel(date, centreId).receipts.reduce((a, r) => a + r.amount, 0);
    },
  };
}

export type Ledger = ReturnType<typeof createLedger>;
