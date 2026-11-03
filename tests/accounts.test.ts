import test from "node:test";
import assert from "node:assert/strict";
import {
  AccountsError,
  createLedger,
  discountCap,
  eachDate,
  inr,
  isOverCap,
  reportsForRole,
  type AuditInput,
  type DayState,
  type LedgerSeed,
} from "../lib/accounts.ts";

// Same figures as the dashboard seed in lib/smartgate-data.ts
const seed: LedgerSeed = {
  centres: [
    { id: "service-a", name: "Service A", type: "service" },
    { id: "service-b", name: "Service B", type: "service" },
    { id: "wash-1", name: "Wash 1", type: "washing" },
    { id: "wash-2", name: "Wash 2", type: "washing" },
    { id: "wash-3", name: "Wash 3", type: "washing" },
  ],
  today: "2026-11-02",
  todaySummaries: [
    { centreId: "service-a", vehiclesIn: 14, collection: 186400, pendingUnbilled: 3 },
    { centreId: "service-b", vehiclesIn: 11, collection: 142900, pendingUnbilled: 2 },
    { centreId: "wash-1", vehiclesIn: 38, collection: 19800, pendingUnbilled: 0 },
    { centreId: "wash-2", vehiclesIn: 31, collection: 16200, pendingUnbilled: 1 },
    { centreId: "wash-3", vehiclesIn: 27, collection: 14050, pendingUnbilled: 0 },
  ],
  chart: [
    { dateStr: "2026-10-27", centres: { "service-a": 165000, "service-b": 132000, "wash-1": 18200, "wash-2": 15400, "wash-3": 13100 } },
    { dateStr: "2026-10-28", centres: { "service-a": 178000, "service-b": 140000, "wash-1": 19100, "wash-2": 16000, "wash-3": 14200 } },
    { dateStr: "2026-10-29", centres: { "service-a": 192000, "service-b": 145000, "wash-1": 21000, "wash-2": 17500, "wash-3": 14900 } },
    { dateStr: "2026-10-30", centres: { "service-a": 174000, "service-b": 138000, "wash-1": 20400, "wash-2": 16800, "wash-3": 13600 } },
    { dateStr: "2026-10-31", centres: { "service-a": 205000, "service-b": 154000, "wash-1": 22500, "wash-2": 18900, "wash-3": 15600 } },
    { dateStr: "2026-11-01", centres: { "service-a": 189000, "service-b": 149000, "wash-1": 21300, "wash-2": 17600, "wash-3": 14800 } },
    { dateStr: "2026-11-02", centres: { "service-a": 186400, "service-b": 142900, "wash-1": 19800, "wash-2": 16200, "wash-3": 14050 } },
  ],
};

function setup() {
  const map = new Map<string, DayState>();
  const log: AuditInput[] = [];
  const ledger = createLedger(seed, {
    store: { get: (d, c) => map.get(`${d}|${c}`), set: (d, c, s) => void map.set(`${d}|${c}`, s) },
    audit: (e) => void log.push(e),
    now: () => 1_700_000_000_000,
  });
  return { ledger, log };
}

const accounts = { name: "Meena R.", role: "Accounts", centreId: "all" };
const owner = { name: "Rajesh Sharma", role: "Owner", centreId: "all" };
const adminA = { name: "Vignesh Admin", role: "Admin", centreId: "service-a" };
const purchase = { name: "Suresh P.", role: "Purchase", centreId: "service-a" };
const technician = { name: "Manoj Kumar", role: "Technician", centreId: "service-a" };
const today = seed.today;

test("inr groups digits the Indian way", () => {
  assert.equal(inr(186400), "₹1,86,400");
  assert.equal(inr(999), "₹999");
  assert.equal(inr(1000), "₹1,000");
  assert.equal(inr(12345678), "₹1,23,45,678");
  assert.equal(inr(-400), "-₹400");
});

test("today's receipts add up to the dashboard figure for every centre", () => {
  const { ledger } = setup();
  for (const s of seed.todaySummaries) {
    assert.equal(ledger.dayTotal(today, s.centreId), s.collection, s.centreId);
    const rec = ledger.getReconciliation(accounts, { date: today, centreId: s.centreId });
    assert.equal(rec.summary.receiptsTotal, s.collection);
    assert.equal(rec.receipts.reduce((a, r) => a + r.amount, 0), s.collection, "totals equal the sum of the lines");
  }
});

test("every charted day ties out to the dashboard chart", () => {
  const { ledger } = setup();
  for (const day of seed.chart) for (const id of Object.keys(day.centres)) assert.equal(ledger.dayTotal(day.dateStr, id), day.centres[id], `${day.dateStr} ${id}`);
});

test("Service A today matches the specification mock-up", () => {
  const { ledger } = setup();
  const r = ledger.getReconciliation(accounts, { date: today, centreId: "service-a" });
  assert.equal(r.summary.receiptsTotal, 186400);
  assert.equal(r.summary.pineTotal, 152000);
  assert.equal(r.summary.pineSettled, 152000);
  assert.equal(r.summary.cashTotal, 34400);
  assert.equal(r.summary.cashCounted, 34000);
  assert.equal(r.summary.cashDiff, -400);
});

test("every receipt shows customer name, car number and a make and model (or none yet)", () => {
  const { ledger } = setup();
  const r = ledger.getReconciliation(accounts, { date: today, centreId: "all" });
  assert.ok(r.receipts.length > 100);
  for (const x of r.receipts) {
    assert.ok(x.customer.length > 2);
    assert.match(x.plate, /^TN \d\d [A-Z]{2} \d{4}$/);
    assert.ok(x.makeModel === null || x.makeModel.includes("·"));
  }
  assert.equal(new Set(r.receipts.map((x) => x.id)).size, r.receipts.length, "receipt ids are unique");
});

test("receipt statuses and differences", () => {
  const { ledger } = setup();
  const b = ledger.getReconciliation(accounts, { date: today, centreId: "service-b" });
  assert.ok(b.receipts.some((x) => x.status === "Late sync"));
  const w2 = ledger.getReconciliation(accounts, { date: today, centreId: "wash-2" });
  assert.ok(w2.receipts.some((x) => x.status === "Not in cash count"));
  const w3 = ledger.getReconciliation(accounts, { date: today, centreId: "wash-3" });
  assert.ok(w3.receipts.some((x) => x.status === "Not settled"));
  assert.ok(w3.summary.pineUnsettled > 0);
  assert.equal(w3.summary.pineSettled + w3.summary.pineUnsettled, w3.summary.pineTotal);
});

test("the day can only be closed when cash is counted and every difference has a note", () => {
  const { ledger, log } = setup();
  const q = { date: today, centreId: "wash-1" };
  let r = ledger.getReconciliation(accounts, q);
  assert.equal(r.summary.cashDiff, -500);
  assert.equal(r.missingNotes, 1);
  assert.throws(() => ledger.closeDay(accounts, q), (e: unknown) => e instanceof AccountsError && e.code === "not-ready");
  ledger.setNote(accounts, { ...q, key: "cash", note: "Counted twice, ₹500 given as change" });
  r = ledger.getReconciliation(accounts, q);
  assert.equal(r.missingNotes, 0);
  assert.deepEqual(r.blockers, []);
  ledger.closeDay(accounts, q);
  r = ledger.getReconciliation(accounts, q);
  assert.ok(r.closed);
  assert.equal(r.closed!.by, "Meena R.");
  assert.equal(r.canEdit, false);
  assert.deepEqual(log.map((l) => l.action), ["Difference explained", "Day closed"]);
  assert.equal(log[1].centre, "Wash 1");
});

test("a closed day can't be edited by anyone, including the Owner", () => {
  const { ledger } = setup();
  const q = { date: "2026-11-01", centreId: "service-a" }; // closed in the seed
  const r = ledger.getReconciliation(accounts, q);
  assert.ok(r.closed);
  assert.deepEqual(r.differences.filter((d) => !d.note), [], "closed days have notes against every difference");
  for (const u of [accounts, owner]) {
    assert.throws(() => ledger.setCashCounted(u, { ...q, amount: 1 }), (e: unknown) => e instanceof AccountsError && e.code === "closed");
    assert.throws(() => ledger.setNote(u, { ...q, key: "cash", note: "x" }), (e: unknown) => e instanceof AccountsError && e.code === "closed");
    assert.throws(() => ledger.closeDay(u, q), (e: unknown) => e instanceof AccountsError && e.code === "closed");
  }
});

test("entering the cash counted is audited and changes the difference", () => {
  const { ledger, log } = setup();
  const q = { date: today, centreId: "service-a" };
  ledger.setCashCounted(accounts, { ...q, amount: 34400 });
  const r = ledger.getReconciliation(accounts, q);
  assert.equal(r.summary.cashDiff, 0);
  assert.equal(r.differences.length, 0);
  assert.equal(log[0].before, "₹34,000");
  assert.equal(log[0].after, "₹34,400");
  assert.throws(() => ledger.setCashCounted(accounts, { ...q, amount: -5 }), (e: unknown) => e instanceof AccountsError && e.code === "invalid");
  assert.throws(() => ledger.setCashCounted(accounts, { ...q, amount: 10.5 }), (e: unknown) => e instanceof AccountsError && e.code === "invalid");
});

test("notes need text and a real difference", () => {
  const { ledger } = setup();
  const q = { date: today, centreId: "service-a" };
  assert.throws(() => ledger.setNote(accounts, { ...q, key: "cash", note: "   " }), (e: unknown) => e instanceof AccountsError && e.code === "invalid");
  assert.throws(() => ledger.setNote(accounts, { ...q, key: "RCT-0", note: "hello" }), (e: unknown) => e instanceof AccountsError && e.code === "invalid");
});

test("Admin / Manager see only their own centre and cannot edit or close", () => {
  const { ledger } = setup();
  const r = ledger.getReconciliation(adminA, { date: today, centreId: "all" });
  assert.deepEqual([...new Set(r.receipts.map((x) => x.centreId))], ["service-a"]);
  assert.equal(r.canEdit, false);
  assert.equal(r.canClose, false);
  assert.throws(() => ledger.getReconciliation(adminA, { date: today, centreId: "service-b" }), (e: unknown) => e instanceof AccountsError && e.code === "no-access");
  assert.throws(() => ledger.closeDay(adminA, { date: today, centreId: "service-a" }), (e: unknown) => e instanceof AccountsError && e.code === "no-access");
  assert.throws(() => ledger.setCashCounted(adminA, { date: today, centreId: "service-a", amount: 1 }), (e: unknown) => e instanceof AccountsError && e.code === "no-access");
});

test("other roles are refused everywhere, even with the right URL", () => {
  const { ledger } = setup();
  for (const u of [purchase, technician]) {
    assert.throws(() => ledger.getReconciliation(u, { date: today, centreId: "all" }), (e: unknown) => e instanceof AccountsError && e.code === "no-access");
    assert.throws(() => ledger.getDiscounts(u, { from: today, to: today, centreId: "all", approver: "all" }), (e: unknown) => e instanceof AccountsError && e.code === "no-access");
    assert.throws(() => ledger.getBill(u, "RCT-8040"), (e: unknown) => e instanceof AccountsError && e.code === "no-access");
  }
});

test("a bill adds up: lines less discount plus GST equals the receipt amount", () => {
  const { ledger } = setup();
  const r = ledger.getReconciliation(accounts, { date: today, centreId: "all" });
  for (const x of r.receipts.slice(0, 60)) {
    const b = ledger.getBill(accounts, x.id);
    const lines = Math.round(b.lines.reduce((a, l) => a + l.amount, 0) * 100) / 100;
    assert.equal(lines, b.subtotal, x.id);
    assert.equal(Math.round((b.subtotal - b.discountValue) * 100) / 100, b.taxable, x.id);
    assert.equal(Math.round((b.taxable + b.gst) * 100) / 100, b.total, x.id);
    assert.equal(b.total, x.amount);
    assert.equal(b.plate, x.plate);
  }
});

test("an Admin can't open a bill from another centre", () => {
  const { ledger } = setup();
  const b = ledger.getReconciliation(accounts, { date: today, centreId: "wash-1" }).receipts[0];
  assert.throws(() => ledger.getBill(adminA, b.id), (e: unknown) => e instanceof AccountsError && e.code === "no-access");
  assert.equal(ledger.getBill(accounts, b.id).receiptId, b.id);
});

test("discount audit lists every discount, inside the role caps, with the dashboard's two invoices", () => {
  const { ledger } = setup();
  const d = ledger.getDiscounts(accounts, { from: "2026-10-27", to: today, centreId: "all", approver: "all" });
  assert.ok(d.rows.length > 10);
  assert.equal(d.summary.count, d.rows.length);
  assert.equal(d.summary.overCap, 0);
  for (const r of d.rows) {
    assert.ok(r.pct <= discountCap(r.role), `${r.invoiceNo} ${r.pct}% by ${r.role}`);
    assert.ok(r.value > 0);
  }
  const inv = d.rows.find((r) => r.invoiceNo === "INV-0877");
  assert.ok(inv);
  assert.equal(inv!.pct, 15);
  assert.equal(inv!.role, "Owner");
  assert.equal(inv!.centreName, "Service B");
  assert.equal(d.summary.atTopTier, d.rows.filter((r) => r.pct === 15).length);
  // every receipt with a discount is in the list, every one in the list is on a receipt
  let onReceipts = 0;
  for (const date of eachDate("2026-10-27", today)) onReceipts += ledger.getReconciliation(accounts, { date, centreId: "all" }).receipts.filter((r) => r.discountPct > 0).length;
  assert.equal(onReceipts, d.rows.length);
});

test("discount filters and role scope", () => {
  const { ledger } = setup();
  const all = ledger.getDiscounts(accounts, { from: "2026-10-27", to: today, centreId: "all", approver: "all" });
  const one = ledger.getDiscounts(accounts, { from: "2026-10-27", to: today, centreId: "service-b", approver: "all" });
  assert.ok(one.rows.every((r) => r.centreId === "service-b"));
  assert.ok(one.rows.length < all.rows.length);
  const who = all.approvers[0];
  const byWho = ledger.getDiscounts(accounts, { from: "2026-10-27", to: today, centreId: "all", approver: who });
  assert.ok(byWho.rows.every((r) => r.approvedBy === who));
  const mine = ledger.getDiscounts(adminA, { from: "2026-10-27", to: today, centreId: "all", approver: "all" });
  assert.ok(mine.rows.every((r) => r.centreId === "service-a"));
  assert.throws(() => ledger.getDiscounts(accounts, { from: today, to: "2026-10-27", centreId: "all", approver: "all" }), (e: unknown) => e instanceof AccountsError);
});

test("discount caps by role", () => {
  assert.equal(discountCap("Owner"), 15);
  assert.equal(discountCap("Admin"), 10);
  assert.equal(discountCap("Manager"), 10);
  assert.equal(discountCap("Supervisor"), 5);
  assert.equal(discountCap("Technician"), 0);
  assert.equal(isOverCap("Supervisor", 10), true);
  assert.equal(isOverCap("Supervisor", 5), false);
  assert.equal(isOverCap("Technician", 5), true);
});

test("daily collection report equals the reconciliation totals", () => {
  const { ledger } = setup();
  const rep = ledger.buildReport(accounts, { report: "daily-collection", from: today, to: today, centreId: "all" });
  assert.equal(rep.rows.length, 5);
  assert.equal(rep.totals!.total, 379350);
  assert.equal(rep.totals!.pine, 301550);
  assert.equal(rep.totals!.cash, 77800);
  assert.equal(rep.totals!.vehicles, 121);
  const rec = ledger.getReconciliation(accounts, { date: today, centreId: "all" });
  assert.equal(rep.totals!.total, rec.summary.receiptsTotal);
  assert.equal(rep.totals!.pine, rec.summary.pineTotal);
  assert.equal(rep.totals!.cash, rec.summary.cashTotal);
  // a week adds up too
  const week = ledger.buildReport(accounts, { report: "daily-collection", from: "2026-10-27", to: today, centreId: "all" });
  assert.equal(week.totals!.total, seed.chart.reduce((a, d) => a + Object.values(d.centres).reduce((x, y) => x + y, 0), 0));
});

test("which reports each role may open", () => {
  const { ledger } = setup();
  assert.deepEqual(reportsForRole("Accounts").map((r) => r.id), ["daily-collection", "membership", "purchase-cost", "discounts"]);
  assert.deepEqual(reportsForRole("Purchase").map((r) => r.id), ["purchase-cost"]);
  assert.deepEqual(reportsForRole("Technician"), []);
  assert.throws(() => ledger.buildReport(accounts, { report: "technician-work", from: today, to: today, centreId: "all" }), (e: unknown) => e instanceof AccountsError);
  assert.throws(() => ledger.buildReport(purchase, { report: "daily-collection", from: today, to: today, centreId: "all" }), (e: unknown) => e instanceof AccountsError && e.code === "no-access");
  const p = ledger.buildReport(purchase, { report: "purchase-cost", from: today, to: today, centreId: "all" });
  assert.equal(p.rows.length, 1, "Purchase sees only their own centre");
  assert.throws(() => ledger.buildReport(adminA, { report: "daily-collection", from: today, to: today, centreId: "wash-1" }), (e: unknown) => e instanceof AccountsError && e.code === "no-access");
});

test("every car number in a report carries its make and model underneath", () => {
  const { ledger } = setup();
  const rep = ledger.buildReport(accounts, { report: "discounts", from: "2026-10-27", to: today, centreId: "all" });
  assert.ok(rep.rows.length > 0);
  for (const r of rep.rows) assert.match(String(r.plate), /^TN \d\d [A-Z]{2} \d{4}\n(.+ · .+|Details pending)$/);
});

test("bad dates are refused", () => {
  const { ledger } = setup();
  assert.throws(() => ledger.getReconciliation(accounts, { date: "02-11-2026", centreId: "all" }), (e: unknown) => e instanceof AccountsError && e.code === "invalid");
  assert.equal(ledger.getReconciliation(accounts, { date: "2026-11-05", centreId: "all" }).receipts.length, 0, "future days are empty");
  assert.throws(() => ledger.setCashCounted(accounts, { date: "2026-11-05", centreId: "wash-1", amount: 5 }), (e: unknown) => e instanceof AccountsError && e.code === "invalid");
});

test("bill lines: quantity times rate equals the line amount", () => {
  const { ledger } = setup();
  const r = ledger.getReconciliation(accounts, { date: today, centreId: "service-a" });
  for (const x of r.receipts) {
    const b = ledger.getBill(accounts, x.id);
    for (const l of b.lines) assert.equal(Math.round(l.qty * l.rate * 100) / 100, l.amount, `${x.id} ${l.desc}`);
    assert.equal(Math.round(b.lines.reduce((a, l) => a + l.amount, 0) * 100) / 100, b.subtotal);
  }
});

// ---------------------------------------------------------------- vehicle search (W3)

test("vehicle search: a plate typed without spaces, in any case, finds the spaced plate", () => {
  const { ledger } = setup();
  const rec = ledger.getReconciliation(accounts, { date: today, centreId: "service-a" }).receipts[0];
  const typed = rec.plate.replace(/\s/g, "").toLowerCase();
  const res = ledger.searchVehicles(accounts, typed);
  assert.equal(res.kind, "plate");
  assert.equal(res.matches[0].plate, rec.plate);
  assert.equal(ledger.searchVehicles(accounts, rec.plate.toLowerCase()).matches[0].plate, rec.plate);
});

test("vehicle search: phone is masked and finds every car on that phone", () => {
  const { ledger } = setup();
  // find a vehicle that has another car on the same phone
  let pair: { plate: string; other: string } | null = null;
  for (const d of eachDate("2026-10-01", today)) {
    for (const row of ledger.getReconciliation(accounts, { date: d, centreId: "all" }).receipts) {
      const det = ledger.getVehicle(accounts, row.plate);
      if (det.otherVehicles.length) {
        pair = { plate: row.plate, other: det.otherVehicles[0].plate };
        break;
      }
    }
    if (pair) break;
  }
  assert.ok(pair, "some phone has two cars");
  const det = ledger.getVehicle(accounts, pair!.plate);
  assert.match(det.phoneMasked, /^\+91 XXXXX X\d{4}$/);
  assert.ok(det.otherVehicles.some((o) => o.plate === pair!.other));
  const last4 = det.phoneMasked.slice(-4);
  assert.ok(ledger.searchVehicles(accounts, last4).matches.some((m) => m.plate === pair!.plate));
});

test("vehicle history: every visit has a bill and the totals add up", () => {
  const { ledger } = setup();
  const rec = ledger.getReconciliation(accounts, { date: today, centreId: "service-a" }).receipts[0];
  const det = ledger.getVehicle(accounts, rec.plate);
  assert.ok(det.history.length >= 1);
  assert.equal(det.visits, det.history.length);
  assert.equal(det.totalSpent, det.history.reduce((a, v) => a + v.amount, 0));
  for (const v of det.history) {
    assert.match(v.jobCard, /^JC-\d+$/);
    const bill = ledger.getBill(accounts, v.receiptId);
    assert.equal(bill.invoiceNo, v.invoiceNo);
  }
  // newest first
  for (let i = 1; i < det.history.length; i++) assert.ok(det.history[i - 1].date + det.history[i - 1].time >= det.history[i].date + det.history[i].time);
});

test("vehicle search: Accounts sees no photos, Owner and Admin can; Admin sees only own-centre visits", () => {
  const { ledger } = setup();
  const rec = ledger.getReconciliation(accounts, { date: today, centreId: "service-a" }).receipts[0];
  assert.equal(ledger.getVehicle(accounts, rec.plate).canSeePhotos, false);
  assert.equal(ledger.getVehicle(owner, rec.plate).canSeePhotos, true);
  const adminView = ledger.getVehicle(adminA, rec.plate);
  assert.ok(adminView.history.every((v) => v.centreId === "service-a"));
  assert.equal(adminView.canSeePhotos, true);
});

test("vehicle search: Purchase and Technician are refused, bad input finds nothing", () => {
  const { ledger } = setup();
  for (const u of [purchase, technician]) {
    assert.throws(() => ledger.searchVehicles(u, "TN 01"), (e) => e instanceof AccountsError && e.code === "no-access");
  }
  assert.deepEqual(ledger.searchVehicles(accounts, "").matches, []);
  assert.deepEqual(ledger.searchVehicles(accounts, "ZZ 99 ZZ 0000").matches, []);
  assert.throws(() => ledger.getVehicle(accounts, "ZZ 99 ZZ 0000"), (e) => e instanceof AccountsError && e.code === "invalid");
});

// ------------------------------------------------------------ purchases, kept per centre

const buy = (centreId: string, over: Record<string, unknown> = {}) => ({
  date: today,
  centreId,
  supplier: "Sri Murugan Auto Spares",
  billNo: "T-1",
  item: "Oil filter",
  qty: 4,
  rate: 320,
  ...over,
});
const wasCode = (code: string) => (e: unknown) => e instanceof AccountsError && e.code === code;

test("purchases: each role only sees the centres it should", () => {
  const { ledger } = setup();
  const range = { from: "2026-10-01", to: today };
  const all = ledger.getPurchases(accounts, { ...range, centreId: "all" });
  assert.ok(all.rows.length > 20);
  assert.equal(all.byCentre.length, seed.centres.length);
  assert.equal(all.summary.total, all.byCentre.reduce((a, c) => a + c.total, 0), "centre totals add up to the grand total");
  const mine = ledger.getPurchases(purchase, { ...range, centreId: "all" });
  assert.ok(mine.rows.length > 0 && mine.rows.every((r) => r.centreId === "service-a"));
  assert.equal(mine.byCentre.length, 1);
  assert.throws(() => ledger.getPurchases(purchase, { ...range, centreId: "wash-1" }), wasCode("no-access"));
  assert.throws(() => ledger.getPurchases(adminA, { ...range, centreId: "service-b" }), wasCode("no-access"));
  assert.throws(() => ledger.getPurchases(technician, { ...range, centreId: "all" }), wasCode("no-access"));
  assert.equal(ledger.getPurchases(accounts, { ...range, centreId: "all" }).canAdd, false);
  assert.equal(mine.canAdd, true);
});

test("purchases: GST is 18% on every line and the total is amount plus GST", () => {
  const { ledger } = setup();
  const r = ledger.getPurchases(owner, { from: "2026-10-01", to: today, centreId: "all" });
  for (const e of r.rows) {
    assert.equal(e.amount, e.qty * e.rate);
    assert.equal(e.gst, Math.round(e.amount * 0.18));
    assert.equal(e.total, e.amount + e.gst);
  }
});

test("purchases: Purchase adds for their own centre only; it shows up and is audited", () => {
  const { ledger, log } = setup();
  const before = ledger.getPurchases(purchase, { from: today, to: today, centreId: "all" }).summary;
  const e = ledger.addPurchase(purchase, buy("service-a"));
  assert.equal(e.amount, 1280);
  assert.equal(e.gst, 230);
  assert.equal(e.total, 1510);
  const after = ledger.getPurchases(purchase, { from: today, to: today, centreId: "all" }).summary;
  assert.equal(after.total - before.total, 1510);
  assert.equal(after.count - before.count, 1);
  assert.equal(log.at(-1)?.action, "Purchase added");
  assert.throws(() => ledger.addPurchase(purchase, buy("wash-1", { billNo: "T-2" })), wasCode("no-access"));
  assert.throws(() => ledger.addPurchase(accounts, buy("service-a", { billNo: "T-3" })), wasCode("no-access"));
  assert.throws(() => ledger.addPurchase(adminA, buy("service-a", { billNo: "T-4" })), wasCode("no-access"));
  assert.deepEqual(ledger.purchaseCentres(purchase).map((c) => c.id), ["service-a"]);
  assert.equal(ledger.purchaseCentres(owner).length, seed.centres.length);
  assert.deepEqual(ledger.purchaseCentres(accounts), []);
});

test("purchases: a second centre can't use the same supplier bill, and a line isn't entered twice", () => {
  const { ledger } = setup();
  ledger.addPurchase(owner, buy("service-a", { billNo: "D-1" }));
  assert.throws(() => ledger.addPurchase(owner, buy("service-a", { billNo: "D-1" })), wasCode("invalid"));
  ledger.addPurchase(owner, buy("service-a", { billNo: "D-1", item: "Air filter" })); // another line on the same bill is fine
  assert.throws(() => ledger.addPurchase(owner, buy("service-b", { billNo: "d-1", item: "Coolant (5 L)" })), (e: unknown) => e instanceof AccountsError && /already entered for Service A/.test(e.message));
});

test("purchases: bad input is refused with a plain message", () => {
  const { ledger } = setup();
  const bad = (over: Record<string, unknown>) => assert.throws(() => ledger.addPurchase(owner, buy("service-a", { billNo: "B-" + Math.random(), ...over })), wasCode("invalid"));
  bad({ qty: 0 });
  bad({ qty: 2.5 });
  bad({ rate: 0 });
  bad({ rate: -5 });
  bad({ supplier: " " });
  bad({ item: "" });
  bad({ date: "2026-11-03" }); // after today
  bad({ date: "2026-09-30" }); // before the books start
  bad({ date: "nope" });
});

test("purchases: Purchase can add late bills for a week, older ones need the Owner; the report reads real entries", () => {
  const { ledger } = setup();
  const old = "2026-10-20";
  const late = "2026-10-28";
  assert.throws(() => ledger.addPurchase(purchase, buy("service-a", { date: old, billNo: "O-1" })), wasCode("invalid"));
  ledger.addPurchase(owner, buy("service-a", { date: old, billNo: "O-1" }));
  ledger.addPurchase(purchase, buy("service-a", { date: late, billNo: "O-2" }));
  assert.ok(ledger.getPurchases(purchase, { from: late, to: late, centreId: "all" }).rows.some((r) => r.billNo === "O-2"));

  const before = ledger.buildReport(accounts, { report: "purchase-cost", from: today, to: today, centreId: "all" });
  assert.equal(before.note, null, "no longer sample figures");
  ledger.addPurchase(owner, buy("service-b", { billNo: "R-1", qty: 1, rate: 1000 }));
  const after = ledger.buildReport(accounts, { report: "purchase-cost", from: today, to: today, centreId: "all" });
  const row = (r: typeof after) => r.rows.find((x) => x.centre === "Service B")!;
  assert.equal(Number(row(after).total) - Number(row(before).total), 1180);
  assert.equal(Number(row(after).bills) - Number(row(before).bills), 1);
  const mine = ledger.buildReport(purchase, { report: "purchase-cost", from: today, to: today, centreId: "all" });
  assert.equal(mine.rows.length, 1);
});
