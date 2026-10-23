// Orange service worker. Generated at build time: VERSION and PRECACHE are filled in.
// Strategy: precache the whole app shell on install, serve it cache-first so the app
// opens with no network (including after a full close), and keep the old version
// until the user taps "Update" (no surprise reloads mid-workout).

const VERSION = "7.1.0-f594d8082d";
const CACHE = `orange-${VERSION}`;
const PRECACHE = ["./","./index.html","./manifest.webmanifest","./assets/app-33bae44f0a.js","./assets/app-2756b45d84.css","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./icons/apple-touch-icon.png","./fonts/interdisplay-BlackItalic.woff","./fonts/interdisplay-ExtraBold.woff"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((p) => new Request(p, { cache: "reload" }))))
  );
  // No skipWaiting here: the page asks for it when the user taps Update.
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Drop older versions, including caches left by the earlier "ironlog-" builds.
      await Promise.all(keys.filter((k) => (k.startsWith("orange-") || k.startsWith("ironlog-")) && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // GitHub API etc. go straight to the network

  if (req.mode === "navigate") {
    // Only the app's own address gets the cached app shell; other pages under this
    // scope (e.g. the retired /v5/ forwarder) load normally, falling back offline.
    const scopePath = new URL(self.registration.scope).pathname;
    if (url.pathname !== scopePath && url.pathname !== `${scopePath}index.html`) {
      event.respondWith(fetch(req).catch(() => caches.match("./index.html", { ignoreSearch: true })));
      return;
    }
    // App shell: always the cached index.html, so launching offline works.
    event.respondWith(
      caches.match("./index.html", { ignoreSearch: true }).then((hit) => hit || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req))
  );
});
