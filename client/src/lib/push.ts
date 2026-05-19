/**
 * LiveLock — Web Push client utilities
 * Handles requesting permission, creating a push subscription,
 * and registering/unregistering it with the server via tRPC.
 */
import { trpc } from "@/lib/trpc";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Request permission, create a push subscription, and save it to the server.
 * Returns true if the user is now subscribed, false otherwise.
 */
export async function registerPushSubscription(vapidPublicKey: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    // Request notification permission if not already granted
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;
    }
    if (Notification.permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    // Save to server via tRPC
    await trpc.notifications.subscribe.mutate({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });

    return true;
  } catch (err) {
    console.warn("[Push] Failed to register subscription:", err);
    return false;
  }
}

/**
 * Unsubscribe from push notifications and remove from server.
 */
export async function unregisterPushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await trpc.notifications.unsubscribe.mutate({ endpoint });
    }

    return true;
  } catch (err) {
    console.warn("[Push] Failed to unregister subscription:", err);
    return false;
  }
}
