// Revenue and customer numbers, calculated from the saved jobs.
// Pure functions with no imports so they can be unit-tested directly.
//
// "Collected" money is counted on the day the payment was taken (paidAt),
// not the day the car was washed.

export type Range = "today" | "7d" | "30d" | "90d";

export interface JobLike {
  carId: string;
  type: string;
  price: number;
  status: string;
  paid?: boolean;
  method?: string;
  paidAt?: number;
  completedAt?: number;
  createdAt: number;
}

export const RANGE_LABEL: Record<Range, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function rangeDays(range: Range): number {
  return range === "today" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 90;
}

/** [start, end) of the range, ending at the end of today. */
export function rangeBounds(range: Range, now: number) {
  const today = startOfDay(now);
  return { start: addDays(today, -(rangeDays(range) - 1)), end: addDays(today, 1) };
}

/** The period of the same length just before the current one. */
export function previousBounds(range: Range, now: number) {
  const { start } = rangeBounds(range, now);
  return { start: addDays(start, -rangeDays(range)), end: start };
}

const isCollected = (j: JobLike, start: number, end: number) =>
  !!j.paid && j.paidAt != null && j.paidAt >= start && j.paidAt < end;

export function collectedJobs<T extends JobLike>(jobs: T[], start: number, end: number): T[] {
  return jobs.filter((j) => isCollected(j, start, end));
}

export function collectedTotal(jobs: JobLike[], start: number, end: number): number {
  return collectedJobs(jobs, start, end).reduce((s, j) => s + j.price, 0);
}

export function completedCount(jobs: JobLike[], start: number, end: number): number {
  return jobs.filter((j) => j.status === "done" && j.completedAt != null && j.completedAt >= start && j.completedAt < end).length;
}

/** Done jobs the customer has not paid for yet. */
export function outstanding<T extends JobLike>(jobs: T[]) {
  const list = jobs.filter((j) => j.status === "done" && !j.paid);
  return { list, count: list.length, total: list.reduce((s, j) => s + j.price, 0) };
}

export interface Bucket {
  label: string;
  start: number;
  end: number;
  value: number;
}

/** Collected money split into bars: hourly, daily or weekly depending on the range. */
export function series(jobs: JobLike[], range: Range, now: number): Bucket[] {
  const { start } = rangeBounds(range, now);
  const buckets: Bucket[] = [];

  if (range === "today") {
    for (let h = 0; h < 24; h++) {
      const s = start + h * 3_600_000;
      buckets.push({ label: String(h).padStart(2, "0"), start: s, end: s + 3_600_000, value: 0 });
    }
  } else if (range === "90d") {
    for (let w = 0; w < 13; w++) {
      const s = addDays(start, w * 7);
      const e = addDays(s, 7);
      buckets.push({ label: new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), start: s, end: e, value: 0 });
    }
  } else {
    const n = rangeDays(range);
    for (let d = 0; d < n; d++) {
      const s = addDays(start, d);
      const e = addDays(s, 1);
      const label =
        range === "7d"
          ? new Date(s).toLocaleDateString("en-IN", { weekday: "short" })
          : new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      buckets.push({ label, start: s, end: e, value: 0 });
    }
  }

  for (const j of jobs) {
    if (!j.paid || j.paidAt == null) continue;
    const b = buckets.find((x) => j.paidAt! >= x.start && j.paidAt! < x.end);
    if (b) b.value += j.price;
  }
  return buckets;
}

export interface Slice {
  label: string;
  value: number;
  count: number;
}

/** Collected money grouped by service or by payment method, biggest first. */
export function breakdown(jobs: JobLike[], start: number, end: number, key: "type" | "method"): Slice[] {
  const map = new Map<string, Slice>();
  for (const j of collectedJobs(jobs, start, end)) {
    const label = (key === "type" ? j.type : j.method) || "other";
    const s = map.get(label) ?? { label, value: 0, count: 0 };
    s.value += j.price;
    s.count += 1;
    map.set(label, s);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

/** Percentage change versus the previous period. null = nothing to compare with. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Per-vehicle totals for the Customers & Vehicles table. */
export interface CarSummary {
  visits: number;
  spent: number;
  lastVisit: number | null;
}

export function carSummaries(jobs: JobLike[]): Map<string, CarSummary> {
  const map = new Map<string, CarSummary>();
  for (const j of jobs) {
    const s = map.get(j.carId) ?? { visits: 0, spent: 0, lastVisit: null };
    s.visits += 1;
    if (j.status === "done") s.spent += j.price;
    if (s.lastVisit == null || j.createdAt > s.lastVisit) s.lastVisit = j.createdAt;
    map.set(j.carId, s);
  }
  return map;
}

/** 1200 -> "1.2k", 150000 -> "1.5L" (Indian style). */
export function compactNumber(n: number): string {
  const trim = (x: number) => String(Math.round(x * 10) / 10);
  if (n >= 10_000_000) return trim(n / 10_000_000) + "Cr";
  if (n >= 100_000) return trim(n / 100_000) + "L";
  if (n >= 1_000) return trim(n / 1_000) + "k";
  return String(Math.round(n));
}

/** "12 min", "1 h 5 min", "2 d" */
export function ago(ts: number, now: number): string {
  const mins = Math.max(0, Math.floor((now - ts) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ${mins % 60} min`;
  return `${Math.floor(h / 24)} d`;
}
