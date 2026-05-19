/**
 * LiveLock — Web Push Notifications
 * Sends push notifications via the Web Push Protocol (RFC 8030).
 * Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL env vars.
 *
 * Generate VAPID keys once with:
 *   node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k))"
 */
import webPush from "web-push";

let _initialised = false;

function init() {
  if (_initialised) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:team@livelock.io";

  if (!publicKey || !privateKey) {
    console.warn("[Push] VAPID keys not set — web push notifications disabled.");
    return;
  }

  webPush.setVapidDetails(email, publicKey, privateKey);
  _initialised = true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send a push notification to a single subscription.
 * Returns true on success, false on any failure (non-throwing).
 */
export async function sendPushNotification(
  subscription: PushSubscriptionKeys,
  payload: {
    title: string;
    body: string;
    url?: string;
    icon?: string;
  }
): Promise<boolean> {
  init();
  if (!_initialised) return false;

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({ ...payload, icon: payload.icon ?? "/icon-192.png" })
    );
    return true;
  } catch (err: any) {
    // 410 Gone = subscription expired / unsubscribed — caller should delete it
    if (err?.statusCode === 410) {
      console.info("[Push] Subscription expired (410):", subscription.endpoint.slice(0, 60));
    } else {
      console.warn("[Push] Failed to send notification:", err?.message ?? err);
    }
    return false;
  }
}
