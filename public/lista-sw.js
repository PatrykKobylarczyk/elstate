// Service worker Listy (zakres /lista).
// Strony zawsze najpierw z sieci; bez sieci ostatnia zapamiętana wersja listy (dane i tak doczyta aplikacja z pamięci telefonu).
// Powiadomienie o nowym wpisie ustawia licznik na ikonie (navigator.setAppBadge, na iPhonie od iOS 16.4 w aplikacji z ekranu początkowego).
const VERSION = "lista-v2";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const OFFLINE = "/lista-offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, "/lista-icons/icon-192.png", "/hero/panorama.webp"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("lista-") && !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.pathname === "/lista") {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put("/lista", copy));
          }
          return res;
        })
        .catch(() => caches.match(url.pathname === "/lista" ? "/lista" : OFFLINE).then((hit) => hit || caches.match(OFFLINE))),
    );
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/lista-icons/") || url.pathname === "/hero/panorama.webp") {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data ? e.data.text() : "" };
  }
  const badge = Number.isInteger(data.badge) ? data.badge : null;
  e.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "Lista", {
        body: data.body || "",
        tag: data.tag || undefined,
        icon: "/lista-icons/icon-192.png",
        badge: "/lista-icons/badge-96.png",
        data: { url: data.url || "/lista" },
      }),
      badge === null || !self.navigator.setAppBadge ? null : (badge > 0 ? self.navigator.setAppBadge(badge) : self.navigator.clearAppBadge()).catch(() => {}),
      // otwarta lista od razu pokazuje nowy wpis
      self.clients.matchAll({ type: "window" }).then((wins) => wins.forEach((w) => w.postMessage("lista-refresh"))),
    ]),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || "/lista", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => new URL(w.url).pathname.startsWith("/lista"));
      if (open) return open.focus();
      return self.clients.openWindow(target);
    }),
  );
});
