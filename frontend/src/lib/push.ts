const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function subscribeToPush(api: {
  getVapidPublicKey: () => Promise<{ data: { publicKey: string } }>;
  subscribe: (subscription: PushSubscriptionJSON) => Promise<unknown>;
}): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error("Le notifiche push non sono supportate su questo dispositivo");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permesso notifiche negato");
  }

  const registration = await navigator.serviceWorker.ready;
  const { data } = await api.getVapidPublicKey();
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await api.subscribe(existing.toJSON());
    return existing;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
  });

  await api.subscribe(subscription.toJSON());
  return subscription;
}

export async function unsubscribeFromPush(api: {
  unsubscribe: (endpoint: string) => Promise<unknown>;
}): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await api.unsubscribe(subscription.endpoint);
  await subscription.unsubscribe();
}
