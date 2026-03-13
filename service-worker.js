const CACHE_NAME = "brewlogger-v3-cache";

const ASSETS = [
  "/brewlogger-v3/",
  "/brewlogger-v3/index.html",
  "/brewlogger-v3/css/style.css",
  "/brewlogger-v3/js/app.js",
  "/brewlogger-v3/manifest.webmanifest",
  "/brewlogger-v3/icons/icon-192.png",
  "/brewlogger-v3/icons/icon-512.png",
  "/brewlogger-v3/icons/maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
