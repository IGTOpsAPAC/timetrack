const CACHE = "timetrack-v35";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  // Delete ALL old caches on activate
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log("[SW] Deleting old cache:", k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Never cache API calls
  if (url.hostname.includes("powerautomate") ||
      url.hostname.includes("graph.microsoft") ||
      url.hostname.includes("login.microsoft") ||
      url.hostname.includes("powerplatform")) {
    e.respondWith(fetch(e.request).catch(() => new Response("Offline", { status: 503 })));
    return;
  }
  // Network first for HTML and JS — always get fresh
  if (e.request.url.endsWith(".html") || e.request.url.endsWith(".js")) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache first for other assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp.ok && e.request.method === "GET") {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});
