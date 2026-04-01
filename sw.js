// CMP notifications service worker

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "CMP",
    body: "Νέα ειδοποίηση",
    url: "/dashboard.html"
  };

  try {
    data = event.data ? event.data.json() : data;
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title || "CMP", {
      body: data.body || "Νέα ειδοποίηση",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: data.url || "/dashboard.html",
      vibrate: [200, 100, 200],
      requireInteraction: true
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data || "/dashboard.html";

  event.waitUntil((async () => {
    const clientList = await clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of clientList) {
      if ("focus" in client) {
        try {
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
        } catch (_) {}
        return client.focus();
      }
    }

    if (clients.openWindow) {
      return clients.openWindow(targetUrl);
    }
  })());
});
