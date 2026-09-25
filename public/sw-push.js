// Service worker exclusivo de Web Push (notificaciones del dashboard
// interno) — no es un service worker de PWA/offline para el sitio
// público, solo maneja los eventos `push`/`notificationclick`. Registrado
// desde PushNotificationSetup.tsx (/dashboard/cuenta), nunca en el sitio
// de marketing.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "SkyCode Agency", {
      body: payload.body || "",
      icon: "/apple-icon.png",
      badge: "/apple-icon.png",
      data: { link: payload.link || "/dashboard" },
    })
  );
});

// Al hacer clic, enfoca una pestaña ya abierta con ese destino si existe,
// o abre una nueva — evita duplicar pestañas del dashboard.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(link) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
