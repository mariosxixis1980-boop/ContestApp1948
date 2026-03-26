// CMP notifications service worker v2
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "CMP", body: "Νέα ειδοποίηση" };
  try {
    data = event.data ? event.data.json() : data;
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title || "CMP", {
      body: data.body || "Νέα ειδοποίηση",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      data: data.url || "./dashboard.html",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data || "./dashboard.html";

  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      if ("focus" in client) {
        client.navigate?.(targetUrl);
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(targetUrl);
  })());
});

self.addEventListener("fetch", () => {
  // No caching here on purpose.
});
