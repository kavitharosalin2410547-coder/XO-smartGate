// Connects the Accounts ledger to this app: the centres and dashboard figures it
// must agree with, browser storage for what Accounts changes, and the audit trail.

import { createLedger, type DayState, type PurchaseEntry, type PurchaseStore, type StateStore } from "./accounts";
import { addAuditEntry, CENTRES, SEED_CHART_7_DAYS, SEED_SUMMARIES_TODAY } from "./smartgate-data";
import type { UserRole } from "./smartgate-types";

const KEY = "smartgate_accounts_days";
const memory: Record<string, DayState> = {};

function read(): Record<string, DayState> {
  try {
    if (typeof window === "undefined") return memory;
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, DayState>) : {};
  } catch {
    return memory;
  }
}

const store: StateStore = {
  get: (date, centreId) => read()[`${date}|${centreId}`],
  set: (date, centreId, state) => {
    const all = read();
    all[`${date}|${centreId}`] = state;
    memory[`${date}|${centreId}`] = state;
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      // storage full or blocked: the change still lives in memory for this visit
    }
  },
};

// Purchases people add are kept in this browser, like the Accounts changes above.
const PURCHASE_KEY = "smartgate_purchases";
const purchaseMemory: PurchaseEntry[] = [];

const purchases: PurchaseStore = {
  added: () => {
    try {
      if (typeof window === "undefined") return purchaseMemory;
      const raw = localStorage.getItem(PURCHASE_KEY);
      return raw ? (JSON.parse(raw) as PurchaseEntry[]) : [];
    } catch {
      return purchaseMemory;
    }
  },
  add: (entry) => {
    const all = [...purchases.added(), entry];
    purchaseMemory.push(entry);
    try {
      localStorage.setItem(PURCHASE_KEY, JSON.stringify(all));
    } catch {
      // storage full or blocked: the entry still lives in memory for this visit
    }
  },
};

export const ACCOUNTS_TODAY = SEED_CHART_7_DAYS[SEED_CHART_7_DAYS.length - 1].dateStr;

export const ledger = createLedger(
  {
    centres: CENTRES.map((c) => ({ id: c.id, name: c.name, type: c.type })),
    today: ACCOUNTS_TODAY,
    todaySummaries: SEED_SUMMARIES_TODAY.map((s) => ({
      centreId: s.centreId,
      vehiclesIn: s.vehiclesIn,
      collection: s.collection,
      pendingUnbilled: s.pendingUnbilled,
    })),
    chart: SEED_CHART_7_DAYS.map((d) => ({ dateStr: d.dateStr, centres: d.centres })),
  },
  {
    store,
    purchases,
    // Rule 3: every change goes to the audit trail
    audit: (e) => addAuditEntry({ ...e, role: e.role as UserRole }),
  }
);
