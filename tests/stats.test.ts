import test from "node:test";
import assert from "node:assert/strict";
import {
  ago,
  breakdown,
  carSummaries,
  collectedTotal,
  compactNumber,
  outstanding,
  pctChange,
  previousBounds,
  rangeBounds,
  series,
  type JobLike,
} from "../lib/stats.ts";
import { DEFAULT_PERMISSIONS, can, normalizePermissions } from "../lib/permissions.ts";

// Sunday 1 Nov 2026, 3 pm local time
const NOW = new Date(2026, 10, 1, 15, 0).getTime();
const day = (offset: number, hour = 12) => new Date(2026, 10, 1 + offset, hour, 0).getTime();

const job = (over: Partial<JobLike>): JobLike => ({
  carId: "a",
  type: "Basic Water Wash",
  price: 200,
  status: "done",
  paid: true,
  method: "cash",
  createdAt: day(0, 9),
  completedAt: day(0, 10),
  paidAt: day(0, 11),
  ...over,
});

test("rangeBounds covers whole days ending today", () => {
  const { start, end } = rangeBounds("7d", NOW);
  assert.equal(start, new Date(2026, 9, 26).getTime()); // 26 Oct
  assert.equal(end, new Date(2026, 10, 2).getTime()); // start of 2 Nov
  assert.equal(previousBounds("7d", NOW).end, start);
});

test("collected money counts by payment day, only for paid jobs", () => {
  const jobs = [
    job({ price: 200 }), // today
    job({ price: 350, paidAt: day(-2) }), // 2 days ago
    job({ price: 999, paid: false, paidAt: undefined }), // unpaid
    job({ price: 400, paidAt: day(-10) }), // outside 7d
  ];
  const { start, end } = rangeBounds("7d", NOW);
  assert.equal(collectedTotal(jobs, start, end), 550);
  const t = rangeBounds("today", NOW);
  assert.equal(collectedTotal(jobs, t.start, t.end), 200);
});

test("series puts each payment in the right bar", () => {
  const jobs = [job({ price: 200 }), job({ price: 100, paidAt: day(0, 14) }), job({ price: 350, paidAt: day(-1) })];
  const week = series(jobs, "7d", NOW);
  assert.equal(week.length, 7);
  assert.equal(week[6].value, 300); // today is the last bar
  assert.equal(week[5].value, 350); // yesterday
  assert.equal(week.reduce((s, b) => s + b.value, 0), 650);

  const hours = series(jobs, "today", NOW);
  assert.equal(hours.length, 24);
  assert.equal(hours[11].value, 200);
  assert.equal(hours[14].value, 100);

  assert.equal(series([], "90d", NOW).length, 13);
  assert.equal(series([], "30d", NOW).length, 30);
});

test("breakdown groups collected money by service and by method", () => {
  const jobs = [
    job({ price: 200, type: "Basic Water Wash", method: "cash" }),
    job({ price: 350, type: "Foam Wash", method: "upi" }),
    job({ price: 200, type: "Basic Water Wash", method: "upi" }),
  ];
  const { start, end } = rangeBounds("7d", NOW);
  const byService = breakdown(jobs, start, end, "type");
  assert.deepEqual(byService.map((s) => [s.label, s.value, s.count]), [
    ["Basic Water Wash", 400, 2],
    ["Foam Wash", 350, 1],
  ]);
  const byMethod = breakdown(jobs, start, end, "method");
  assert.deepEqual(byMethod.map((s) => [s.label, s.value]), [
    ["upi", 550],
    ["cash", 200],
  ]);
});

test("outstanding = finished jobs that are not paid", () => {
  const jobs = [
    job({ paid: false, paidAt: undefined, price: 300 }),
    job({ paid: false, paidAt: undefined, status: "in_progress", price: 500 }), // still washing: not due yet
    job({ price: 200 }),
  ];
  const o = outstanding(jobs);
  assert.equal(o.count, 1);
  assert.equal(o.total, 300);
});

test("pctChange handles empty previous periods", () => {
  assert.equal(pctChange(150, 100), 50);
  assert.equal(pctChange(50, 100), -50);
  assert.equal(pctChange(0, 0), 0);
  assert.equal(pctChange(100, 0), null);
});

test("carSummaries totals visits and spend per vehicle", () => {
  const jobs = [
    job({ carId: "a", price: 200 }),
    job({ carId: "a", price: 350, createdAt: day(-3) }),
    job({ carId: "b", price: 400, status: "pending", paid: false }),
  ];
  const m = carSummaries(jobs);
  assert.equal(m.get("a")!.visits, 2);
  assert.equal(m.get("a")!.spent, 550);
  assert.equal(m.get("b")!.spent, 0); // not done yet
  assert.equal(m.get("a")!.lastVisit, day(0, 9));
});

test("compactNumber and ago", () => {
  assert.equal(compactNumber(950), "950");
  assert.equal(compactNumber(1200), "1.2k");
  assert.equal(compactNumber(150000), "1.5L");
  assert.equal(ago(NOW - 5 * 60_000, NOW), "5 min");
  assert.equal(ago(NOW - 65 * 60_000, NOW), "1 h 5 min");
  assert.equal(ago(NOW, NOW), "just now");
});

test("permissions: admin has everything, others follow the matrix", () => {
  const map = normalizePermissions(null);
  assert.equal(can(map, "admin", "admin.manage"), true);
  assert.equal(can(map, "manager", "revenue.view"), true);
  assert.equal(can(map, "manager", "admin.manage"), false);
  assert.equal(can(map, "cashier", "payments.collect"), true);
  assert.equal(can(map, "cashier", "revenue.view"), false);
  assert.equal(can(map, "washer", "jobs.update"), true);
  assert.equal(can(map, "washer", "jobs.delete"), false);
  assert.equal(can(map, undefined, "home.view"), false);
});

test("normalizePermissions cannot grant admin-only rights or shrink admin", () => {
  const map = normalizePermissions({ ...DEFAULT_PERMISSIONS, cashier: ["home.view", "admin.manage", "bogus.perm"], admin: [] });
  assert.deepEqual(map.cashier, ["home.view"]);
  assert.equal(can(map, "admin", "revenue.export"), true);
});
