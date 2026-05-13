self.addEventListener("push", event => {
  let data = { title: "Squad Notification", body: "You have a new update.", url: "/" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: {
      url: data.url || "/",
      type: data.type,
      eventId: data.eventId,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
