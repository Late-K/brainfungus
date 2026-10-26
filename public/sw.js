// service worker - only caches static build files and icons, plus an offline page.
// pages and /api responses are never cached, since they're per-user and behind auth

// bump this to throw away old cached files
const CACHE = "brainfungus-static-v2";

// shown instead of the browser's error screen when a page can't load
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      // lets page requests start while the worker boots, so going through it doesn't slow pages down
      .then(() => self.registration.navigationPreload?.enable())
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // pages always come from the network - the offline page is only a fallback when that fails
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) || (await fetch(request));
        } catch {
          return caches.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }

  // next's build files have content hashes in their names so they never change - safe to serve from cache
  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
  if (!isStatic) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});

// push notifications - the server sends { title, body, url, tag }
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const url = new URL(data.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // skip chat notifications when that chat is already open and on screen
      const isViewingChat =
        data.tag?.startsWith("chat-") &&
        windows.some((w) => w.focused && w.visibilityState === "visible" && w.url === url);
      if (isViewingChat) return;

      return self.registration.showNotification(data.title || "Brain Fungus", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag,
        data: { url },
      });
    })
  );
});

// open (or focus) the app on the notification's page when it's tapped
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin + "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const exact = windows.find((w) => w.url === url);
      if (exact) return exact.focus();

      const existing = windows[0];
      if (existing) return existing.focus().then((w) => (w || existing).navigate(url));

      return self.clients.openWindow(url);
    })
  );
});
