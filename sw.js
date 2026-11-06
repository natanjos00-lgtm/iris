// ÍRIS — service worker mínimo (necessário para instalar o app). Avisos (push) entram aqui depois.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => { if (e.request.method === "GET") e.respondWith(fetch(e.request).catch(() => new Response("Sem conexão.", { status: 503 }))); });
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "ÍRIS", { body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", e => { e.notification.close(); const u = (e.notification.data && e.notification.data.url) || "./"; e.waitUntil(self.clients.matchAll({ type: "window" }).then(l => { for (const c of l) if ("focus" in c) return c.focus(); return self.clients.openWindow(u); })); });
