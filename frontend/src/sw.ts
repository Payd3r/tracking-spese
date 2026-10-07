/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//],
  })
);

registerRoute(
  ({ url }) => url.hostname === "api.frankfurter.app",
  new CacheFirst({
    cacheName: "currency-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 5 }),
    ],
  })
);

self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string; transactionId?: number } = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Tracking Spese", body: event.data?.text() || "Nuova notifica" };
  }

  const title = data.title || "Tracking Spese";
  const options: NotificationOptions = {
    body: data.body || "Hai un aggiornamento",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: data.url || (data.transactionId ? `/?tx=${data.transactionId}` : "/"),
      transactionId: data.transactionId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await (client as WindowClient).navigate(targetUrl);
          } else {
            client.postMessage({ type: "OPEN_TRANSACTION", url: targetUrl });
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
