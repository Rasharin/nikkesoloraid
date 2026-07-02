const CACHE_NAME = "nideck-static-v2";

const NETWORK_ONLY = [
  /supabase\.co/,
  /\/_next\/image(\?|$)/,
  /\/_next\/static\//,
  /\/api\//,
];

const CACHE_FIRST = [
  /\/nikke-images\//,
  /\/blablalink-icon\.webp$/,
  /\/logo[^/]*\.png$/,
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CLEAR_NIKKE_IMAGE_CACHE") return;

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("nideck-static-"))
          .map(async (key) => {
            const cache = await caches.open(key);
            const requests = await cache.keys();
            await Promise.all(
              requests
                .filter((request) => new URL(request.url).pathname.includes("/nikke-images/"))
                .map((request) => cache.delete(request))
            );
          })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = request.url;
  if (NETWORK_ONLY.some((pattern) => pattern.test(url))) return;

  if (CACHE_FIRST.some((pattern) => pattern.test(url))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;

        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
    );
  }
});
