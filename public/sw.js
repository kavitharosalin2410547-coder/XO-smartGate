/* Garage Desk service worker.
 *
 * The list of files to cache is NOT written by hand: after `next build`,
 * scripts/inject-precache.mjs scans the finished `out/` folder and replaces the
 * two placeholders below with every file the app needs (pages, JS, CSS, icons,
 * and the OCR engine). That way a new build always caches the right files.
 */
const CACHE_NAME = "garage-desk-__BUILD_ID__";
const PRECACHE = /*__PRECACHE__*/[];

// INSTALL: download every app file into the cache. If any file fails, the
// install fails and the browser retries later, so we never end up half-cached.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })))))
      .then(() => self.skipWaiting()),
  );
});

// ACTIVATE: remove caches left by older builds, then take control of open tabs.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("garage-desk-") && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// FETCH: answer from the cache first. Query strings are ignored so
// /car/?id=123 is served by the cached /car/ page (the page reads ?id itself).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Page loads: try the network first so a new build shows up on a normal reload,
  // and fall back to the cached copy when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req, { ignoreSearch: true });
          if (cached) return cached;
          const home = await caches.match("/", { ignoreSearch: true });
          return home || Response.error();
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(async (cached) => {
      if (cached) return cached;
      try {
        return await fetch(req);
      } catch (err) {
        // Offline and not cached: for page loads, fall back to the app's home page.
        if (req.mode === "navigate") {
          const home = await caches.match("/", { ignoreSearch: true });
          if (home) return home;
        }
        return Response.error();
      }
    }),
  );
});
