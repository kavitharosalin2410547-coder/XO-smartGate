// Runs after `next build`. Lists every file in out/ and writes that list (plus a
// version hash) into out/sw.js, so the service worker caches the whole app.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = join(process.cwd(), "out");
if (!existsSync(join(OUT, "sw.js"))) {
  console.error("[precache] out/sw.js not found. Run `next build` first.");
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(OUT)
  .filter((f) => !f.endsWith(".map"))
  .map((f) => ({ abs: f, url: "/" + relative(OUT, f).split(sep).join("/") }))
  .filter((f) => f.url !== "/sw.js");

const urls = new Set();
const hash = createHash("sha256");
for (const f of files.sort((a, b) => a.url.localeCompare(b.url))) {
  urls.add(f.url);
  // /cars/index.html is also reachable as /cars/ (and "/" for the root page)
  if (f.url.endsWith("/index.html")) urls.add(f.url.slice(0, -"index.html".length));
  hash.update(f.url).update(readFileSync(f.abs));
}

const list = [...urls].sort();
const buildId = hash.digest("hex").slice(0, 10);

let sw = readFileSync(join(OUT, "sw.js"), "utf8");
sw = sw.replace("__BUILD_ID__", buildId).replace("/*__PRECACHE__*/[]", JSON.stringify(list, null, 2));
writeFileSync(join(OUT, "sw.js"), sw);

const bytes = files.reduce((s, f) => s + statSync(f.abs).size, 0);
console.log(`[precache] ${list.length} URLs, ${(bytes / 1048576).toFixed(1)} MB, cache version ${buildId}`);
