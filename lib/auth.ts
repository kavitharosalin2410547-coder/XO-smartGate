// Local-only accounts with roles. Passwords are stored as salted PBKDF2 hashes
// in IndexedDB. This keeps casual users out and lets the owner control who can
// do what, but it is NOT server-grade security: anyone with full access to the
// device's browser data could still read the stored records.
import { SESSION_KEY, countUsers, getUser, listUsers, logAction, putUser, setBusinessName, type User } from "./db";
import type { Role } from "./permissions";

const ITERATIONS = 120_000;

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(password: string, salt: Uint8Array) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure storage is unavailable here. Open the app from localhost or an https address.");
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

async function makeCredentials(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toHex(salt.buffer as ArrayBuffer), hash: await derive(password, salt) };
}

function checkUsername(username: string) {
  const name = username.trim().toLowerCase();
  if (name.length < 3) throw new Error("Username must be at least 3 characters.");
  if (!/^[a-z0-9._-]+$/.test(name)) throw new Error("Username can use letters, numbers, dot, dash and underscore only.");
  return name;
}
function checkPassword(password: string) {
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
}

export async function hasAnyUser() {
  return (await countUsers()) > 0;
}

/** First-time setup: creates the business and its Admin account. */
export async function register(opts: { business: string; name: string; username: string; password: string }) {
  const username = checkUsername(opts.username);
  checkPassword(opts.password);
  if (await hasAnyUser()) throw new Error("An account already exists on this device.");
  const creds = await makeCredentials(opts.password);
  await putUser({
    username,
    name: opts.name.trim() || username,
    role: "admin",
    active: true,
    createdAt: Date.now(),
    ...creds,
  });
  await setBusinessName(opts.business);
  startSession(username);
  await logAction("account.created", `Business set up by ${username}`, username);
}

export async function login(username: string, password: string) {
  const name = username.trim().toLowerCase();
  const user = await getUser(name);
  const hash = user ? await derive(password, fromHex(user.salt)) : null;
  if (!user || hash !== user.hash) throw new Error("Wrong username or password.");
  if (!user.active) throw new Error("This account is disabled. Ask an admin to turn it back on.");
  startSession(name);
  await logAction("login", "Signed in", name);
}

function startSession(username: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, at: Date.now() }));
}

export function currentUsername(): string | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return s?.username ?? null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

/* ---------- user management (Admin page) ---------- */
async function activeAdmins(excluding?: string) {
  return (await listUsers()).filter((u) => u.role === "admin" && u.active && u.username !== excluding);
}

export async function createUser(opts: { name: string; username: string; password: string; role: Role }) {
  const username = checkUsername(opts.username);
  checkPassword(opts.password);
  if (await getUser(username)) throw new Error("That username is already taken.");
  const creds = await makeCredentials(opts.password);
  await putUser({ username, name: opts.name.trim() || username, role: opts.role, active: true, createdAt: Date.now(), ...creds });
  await logAction("user.created", `${username} as ${opts.role}`);
}

export async function updateUser(username: string, patch: Partial<Pick<User, "name" | "role" | "active">>) {
  const user = await getUser(username);
  if (!user) throw new Error("User not found.");
  const losingAdmin = user.role === "admin" && ((patch.role && patch.role !== "admin") || patch.active === false);
  if (losingAdmin && (await activeAdmins(username)).length === 0) {
    throw new Error("There must always be at least one active Admin.");
  }
  if (patch.active === false && username === currentUsername()) {
    throw new Error("You cannot disable your own account.");
  }
  await putUser({ ...user, ...patch });
  if (patch.role && patch.role !== user.role) await logAction("user.role", `${username}: ${user.role} → ${patch.role}`);
  if (patch.active !== undefined && patch.active !== user.active) {
    await logAction(patch.active ? "user.enabled" : "user.disabled", username);
  }
}

export async function resetPassword(username: string, password: string) {
  checkPassword(password);
  const user = await getUser(username);
  if (!user) throw new Error("User not found.");
  await putUser({ ...user, ...(await makeCredentials(password)) });
  await logAction("user.password", `Password reset for ${username}`);
}
