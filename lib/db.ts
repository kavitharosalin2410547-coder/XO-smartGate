// All data lives in the browser's IndexedDB on this device. Nothing is sent
// anywhere, which is what makes the app fully offline.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { cleanPlate, formatPlate } from "./plate";
import { normalizePermissions, type PermissionMap, type Role } from "./permissions";
import type { JobStatus } from "./services";

export const SESSION_KEY = "garage_session";

export interface User {
  username: string;
  name: string;
  role: Role;
  active: boolean;
  salt: string;
  hash: string;
  createdAt: number;
}

export interface Car {
  id: string;
  plate: string; // normalised, unique
  ownerName: string;
  phone: string;
  make: string;
  model: string;
  color: string;
  notes: string;
  createdAt: number;
}

export type PayMethod = "cash" | "upi" | "card";

export interface Job {
  id: string;
  carId: string;
  type: string;
  price: number;
  status: JobStatus;
  notes: string;
  createdAt: number;
  completedAt?: number;
  paid: boolean;
  method?: PayMethod;
  paidAt?: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface AuditEntry {
  id: string;
  at: number;
  user: string;
  action: string;
  detail: string;
}

interface GarageDB extends DBSchema {
  users: { key: string; value: User };
  cars: { key: string; value: Car; indexes: { plate: string } };
  jobs: { key: string; value: Job; indexes: { carId: string } };
  settings: { key: string; value: Setting };
  audit: { key: string; value: AuditEntry; indexes: { at: number } };
}

export class DuplicatePlateError extends Error {
  existingId: string;
  constructor(existingId: string) {
    super("A car with this number plate already exists.");
    this.name = "DuplicatePlateError";
    this.existingId = existingId;
  }
}

let dbPromise: Promise<IDBPDatabase<GarageDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<GarageDB>("garage-offline", 2, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          db.createObjectStore("users", { keyPath: "username" });
          const cars = db.createObjectStore("cars", { keyPath: "id" });
          cars.createIndex("plate", "plate", { unique: true });
          const jobs = db.createObjectStore("jobs", { keyPath: "id" });
          jobs.createIndex("carId", "carId");
        }
        if (oldVersion < 2) {
          db.createObjectStore("settings", { keyPath: "key" });
          const audit = db.createObjectStore("audit", { keyPath: "id" });
          audit.createIndex("at", "at");
          // Data saved by version 1: the first account becomes the admin, and
          // finished jobs are treated as already paid in cash.
          if (oldVersion === 1) {
            void (async () => {
              for (const u of await tx.objectStore("users").getAll()) {
                await tx.objectStore("users").put({ ...u, name: (u as any).name ?? u.username, role: "admin", active: true });
              }
              for (const j of await tx.objectStore("jobs").getAll()) {
                const done = j.status === "done";
                await tx.objectStore("jobs").put({ ...j, paid: done, method: done ? "cash" : undefined, paidAt: done ? j.completedAt ?? j.createdAt : undefined });
              }
            })();
          }
        }
      },
    });
  }
  return dbPromise;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* ---------- activity log ---------- */
function actor(): string {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.username ?? "system";
  } catch {
    return "system";
  }
}

export async function logAction(action: string, detail: string, user?: string) {
  try {
    const db = await getDb();
    await db.add("audit", { id: uid(), at: Date.now(), user: user ?? actor(), action, detail });
    // keep the log from growing forever
    if ((await db.count("audit")) > 1500) {
      const tx = db.transaction("audit", "readwrite");
      let cursor = await tx.store.index("at").openCursor();
      for (let n = 0; cursor && n < 300; n++) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
    }
  } catch (err) {
    console.error("audit log failed", err);
  }
}

export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  const all = await (await getDb()).getAllFromIndex("audit", "at");
  return all.reverse().slice(0, limit);
}

/* ---------- settings: business name, permissions ---------- */
async function getSetting<T>(key: string): Promise<T | undefined> {
  return ((await (await getDb()).get("settings", key)) as Setting | undefined)?.value as T | undefined;
}
async function putSetting(key: string, value: unknown) {
  await (await getDb()).put("settings", { key, value });
}

export async function getBusinessName(): Promise<string> {
  return (await getSetting<string>("businessName")) || "Garage Desk";
}
export async function setBusinessName(name: string) {
  await putSetting("businessName", name.trim() || "Garage Desk");
}

export async function loadPermissions(): Promise<PermissionMap> {
  return normalizePermissions(await getSetting<Partial<PermissionMap>>("permissions"));
}
export async function savePermissions(map: PermissionMap) {
  await putSetting("permissions", normalizePermissions(map));
}

/* ---------- users ---------- */
export async function countUsers() {
  return (await getDb()).count("users");
}
export async function getUser(username: string) {
  return (await getDb()).get("users", username);
}
export async function putUser(user: User) {
  await (await getDb()).put("users", user);
}
export async function listUsers(): Promise<User[]> {
  const users = await (await getDb()).getAll("users");
  return users.sort((a, b) => a.createdAt - b.createdAt);
}

/* ---------- cars ---------- */
export type CarInput = Omit<Car, "id" | "createdAt">;

export async function addCar(input: CarInput): Promise<Car> {
  const db = await getDb();
  const plate = cleanPlate(input.plate);
  const existing = await db.getFromIndex("cars", "plate", plate);
  if (existing) throw new DuplicatePlateError(existing.id);
  const car: Car = { ...input, plate, id: uid(), createdAt: Date.now() };
  await db.add("cars", car);
  await logAction("vehicle.added", formatPlate(plate));
  return car;
}

export async function updateCar(id: string, input: CarInput): Promise<Car> {
  const db = await getDb();
  const old = await db.get("cars", id);
  if (!old) throw new Error("Car not found");
  const plate = cleanPlate(input.plate);
  const clash = await db.getFromIndex("cars", "plate", plate);
  if (clash && clash.id !== id) throw new DuplicatePlateError(clash.id);
  const car: Car = { ...old, ...input, plate };
  await db.put("cars", car);
  await logAction("vehicle.edited", formatPlate(plate));
  return car;
}

export async function deleteCar(id: string) {
  const db = await getDb();
  const car = await db.get("cars", id);
  const tx = db.transaction(["cars", "jobs"], "readwrite");
  const jobKeys = await tx.objectStore("jobs").index("carId").getAllKeys(id);
  await Promise.all(jobKeys.map((k) => tx.objectStore("jobs").delete(k)));
  await tx.objectStore("cars").delete(id);
  await tx.done;
  await logAction("vehicle.deleted", `${car ? formatPlate(car.plate) : id} and ${jobKeys.length} job(s)`);
}

export async function getCar(id: string) {
  return (await getDb()).get("cars", id);
}
export async function getCarByPlate(plate: string) {
  return (await getDb()).getFromIndex("cars", "plate", cleanPlate(plate));
}
export async function listCars(): Promise<Car[]> {
  const cars = await (await getDb()).getAll("cars");
  return cars.sort((a, b) => b.createdAt - a.createdAt);
}

/** Search by plate (spaces/case ignored), owner, phone, make or model. */
export async function searchCars(query: string): Promise<Car[]> {
  const all = await listCars();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  const qPlate = cleanPlate(query);
  return all.filter(
    (c) =>
      (qPlate && c.plate.includes(qPlate)) ||
      c.ownerName.toLowerCase().includes(q) ||
      c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
      `${c.make} ${c.model}`.toLowerCase().includes(q),
  );
}

/* ---------- jobs ---------- */
async function plateOf(carId: string) {
  const car = await (await getDb()).get("cars", carId);
  return car ? formatPlate(car.plate) : "unknown vehicle";
}

export async function addJob(input: Pick<Job, "carId" | "type" | "price" | "notes">): Promise<Job> {
  const job: Job = { ...input, id: uid(), status: "pending", createdAt: Date.now(), paid: false };
  await (await getDb()).add("jobs", job);
  await logAction("job.created", `${input.type} for ${await plateOf(input.carId)}`);
  return job;
}

export async function setJobStatus(id: string, status: JobStatus) {
  const db = await getDb();
  const job = await db.get("jobs", id);
  if (!job) return;
  job.status = status;
  job.completedAt = status === "done" ? Date.now() : undefined;
  await db.put("jobs", job);
  await logAction("job.status", `${job.type} for ${await plateOf(job.carId)} is now ${status.replace("_", " ")}`);
}

export async function markPaid(id: string, method: PayMethod) {
  const db = await getDb();
  const job = await db.get("jobs", id);
  if (!job) return;
  job.paid = true;
  job.method = method;
  job.paidAt = Date.now();
  await db.put("jobs", job);
  await logAction("payment.collected", `₹${job.price} by ${method} for ${await plateOf(job.carId)}`);
}

export async function markUnpaid(id: string) {
  const db = await getDb();
  const job = await db.get("jobs", id);
  if (!job) return;
  job.paid = false;
  job.method = undefined;
  job.paidAt = undefined;
  await db.put("jobs", job);
  await logAction("payment.reversed", `${job.type} for ${await plateOf(job.carId)}`);
}

export async function deleteJob(id: string) {
  const db = await getDb();
  const job = await db.get("jobs", id);
  await db.delete("jobs", id);
  if (job) await logAction("job.deleted", `${job.type} for ${await plateOf(job.carId)}`);
}

export async function listJobsForCar(carId: string): Promise<Job[]> {
  const jobs = await (await getDb()).getAllFromIndex("jobs", "carId", carId);
  return jobs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function listAllJobs(): Promise<Job[]> {
  const jobs = await (await getDb()).getAll("jobs");
  return jobs.sort((a, b) => b.createdAt - a.createdAt);
}

/* ---------- backup ---------- */
export interface Backup {
  app: "garage-offline";
  version: 1 | 2;
  exportedAt: string;
  users: User[];
  cars: Car[];
  jobs: Job[];
  settings?: Setting[];
  audit?: AuditEntry[];
}

export async function exportAll(): Promise<Backup> {
  const db = await getDb();
  await logAction("backup.exported", "Backup file downloaded");
  return {
    app: "garage-offline",
    version: 2,
    exportedAt: new Date().toISOString(),
    users: await db.getAll("users"),
    cars: await db.getAll("cars"),
    jobs: await db.getAll("jobs"),
    settings: await db.getAll("settings"),
    audit: await db.getAll("audit"),
  };
}

export function isBackup(x: unknown): x is Backup {
  const b = x as Backup;
  return !!b && b.app === "garage-offline" && Array.isArray(b.users) && Array.isArray(b.cars) && Array.isArray(b.jobs);
}

/** Replace everything on this device with the contents of a backup (v1 or v2). */
export async function importAll(b: Backup) {
  const db = await getDb();
  const users: User[] = b.users.map((u) => ({ ...u, name: u.name ?? u.username, role: u.role ?? "admin", active: u.active ?? true }));
  const jobs: Job[] = b.jobs.map((j) => {
    if (typeof j.paid === "boolean") return j;
    const done = j.status === "done";
    return { ...j, paid: done, method: done ? "cash" : undefined, paidAt: done ? j.completedAt ?? j.createdAt : undefined };
  });

  const tx = db.transaction(["users", "cars", "jobs", "settings", "audit"], "readwrite");
  await Promise.all(["users", "cars", "jobs", "settings", "audit"].map((s) => tx.objectStore(s as "users").clear()));
  await Promise.all([
    ...users.map((u) => tx.objectStore("users").put(u)),
    ...b.cars.map((c) => tx.objectStore("cars").put(c)),
    ...jobs.map((j) => tx.objectStore("jobs").put(j)),
    ...(b.settings ?? []).map((s) => tx.objectStore("settings").put(s)),
    ...(b.audit ?? []).map((a) => tx.objectStore("audit").put(a)),
  ]);
  await tx.done;
  await logAction("backup.restored", `${b.cars.length} vehicles, ${b.jobs.length} jobs`);
}

export async function wipeAll() {
  const db = await getDb();
  const tx = db.transaction(["users", "cars", "jobs", "settings", "audit"], "readwrite");
  await Promise.all(["users", "cars", "jobs", "settings", "audit"].map((s) => tx.objectStore(s as "users").clear()));
  await tx.done;
}
