const CACHE = "me-sim-companion-shell-v2";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.mjs",
  "./data.mjs",
  "./db.mjs",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith("/companion/")
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        if (response.ok) {
          if (SHELL.some((asset) => new URL(asset, self.location.href).href === url.href)) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {}),
            );
          }
          return response;
        }
        return (await caches.match(event.request)) || response;
      })
      .catch(() => caches.match(event.request)),
  );
});
