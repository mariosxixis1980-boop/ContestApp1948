// Minimal Service Worker for installability only (no caching logic)
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally no caching to avoid stale contest/admin state.
});


self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "CMP";
  const options = {
    body: data.body || "Έχεις νέα ενημέρωση.",
    icon: data.icon || "./icon-192.png",
    badge: data.badge || "./icon-192.png",
    data: {
      url: data.url || "./dashboard.html",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "./dashboard.html";

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of allClients) {
      if ("focus" in client) {
        try {
          await client.navigate(targetUrl);
        } catch (_) {}
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(targetUrl);
  })());
});
