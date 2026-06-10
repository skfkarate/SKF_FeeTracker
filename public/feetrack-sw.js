self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "SKF FeeTrack Notification",
      body: event.data ? event.data.text() : "New FeeTrack update.",
    };
  }

  const title = payload.title || "SKF FeeTrack Notification";
  const options = {
    body: payload.body || "New FeeTrack update.",
    icon: payload.icon || "/logo.png",
    badge: payload.badge || "/logo.png",
    tag: payload.tag || "feetrack-update",
    data: {
      url: payload.url || "/dashboard",
      timestamp: payload.timestamp || Date.now(),
    },
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
