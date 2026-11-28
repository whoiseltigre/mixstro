/* Mixstro service worker: shows push notifications and opens the right page on tap.
   Registered as /sw.js?app=1 inside the iPhone app, where it also caches, so the app opens
   fast on a slow connection and still opens offline. The website never caches through it. */
const IN_APP = new URL(self.location.href).searchParams.get("app") === "1";
const CACHE = "mixstro-app-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Mixstro", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Mixstro";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: data.icon || "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/discover" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/discover", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

// ---- iPhone app only: caching ----------------------------------------------------------------

/** Assets that never change once published (hashed file names) or rarely do. */
function isStatic(url) {
  return url.pathname.startsWith("/_next/static/") || /^\/(sounds|photos|site)\//.test(url.pathname) || /\.(?:png|jpg|jpeg|webp|svg|woff2?|ico)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  if (!IN_APP) return;
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (isStatic(url)) {
    // Cache first: these files never change under the same name.
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    // Network first, but don't keep someone staring at a blank screen: after 3.5s, or offline,
    // show the last copy of this screen and keep the fresh one for next time.
    event.respondWith(
      caches.open(CACHE).then((cache) => {
        const network = fetch(req).then((res) => {
          if (res.ok && res.type === "basic" && !res.redirected) cache.put(req, res.clone());
          return res;
        });
        const fallback = new Promise((resolve) => setTimeout(resolve, 3500)).then(() => cache.match(req));
        return Promise.race([network.catch(() => cache.match(req)), fallback.then((hit) => hit || network)]).then(
          (res) => res || network,
        );
      }),
    );
  }
});

// Sign out and Delete account clear what this phone kept (src/lib/safety.ts).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "mixstro:clear-cache") event.waitUntil(caches.delete(CACHE));
});
