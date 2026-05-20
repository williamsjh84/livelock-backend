/**
 * LiveLock — Webhook Delivery
 *
 * Fires HTTP POST to customer endpoints when session events occur.
 * Payloads are signed with HMAC-SHA256 so customers can verify authenticity.
 * Delivery is fire-and-forget with 3 retry attempts (1s, 3s, 9s backoff).
 */
import crypto from "crypto";

export type WebhookEvent =
  | "session.verified"
  | "session.rejected"
  | "session.expired"
  | "session.cancelled"
  | "session.initiated";

export interface WebhookPayload {
  event: WebhookEvent;
  sessionId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Sign a webhook payload with HMAC-SHA256.
 * Header: X-LiveLock-Signature: sha256=<hex>
 */
export function signWebhook(payload: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Deliver a webhook to a single endpoint.
 * Returns true on success, false on failure.
 */
async function deliverOnce(url: string, payload: string, signature: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LiveLock-Signature": signature,
        "X-LiveLock-Event": JSON.parse(payload).event,
        "User-Agent": "LiveLock-Webhook/1.0",
      },
      body: payload,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget webhook delivery with retries.
 * Caller does not await this.
 */
export async function deliverWebhook(
  url: string,
  secret: string,
  event: WebhookEvent,
  sessionId: string,
  data: Record<string, unknown>
): Promise<void> {
  const payload = JSON.stringify({
    event,
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  } satisfies WebhookPayload);

  const signature = signWebhook(payload, secret);
  const delays = [0, 1000, 3000, 9000];

  for (const delay of delays) {
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    const ok = await deliverOnce(url, payload, signature);
    if (ok) {
      console.log(`[Webhook] Delivered ${event} to ${url}`);
      return;
    }
    console.warn(`[Webhook] Delivery attempt failed for ${url}`);
  }

  console.error(`[Webhook] All delivery attempts failed for ${url} (${event})`);
}

/**
 * Fire webhooks for all API keys registered to a team.
 * Called from the socket server after session state changes.
 */
export async function fireTeamWebhooks(
  teamId: number | null | undefined,
  event: WebhookEvent,
  sessionId: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!teamId) return;
  try {
    const { getDb } = await import("./db");
    const { apiKeys } = await import("../drizzle/schema");
    const { eq, isNull } = await import("drizzle-orm");

    const db = await getDb();
    if (!db) return;

    const keys = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.teamId, teamId));

    for (const key of keys) {
      if (key.revokedAt) continue;
      if (!key.webhookUrl || !key.webhookSecret) continue;

      // Fire-and-forget per key
      deliverWebhook(key.webhookUrl, key.webhookSecret, event, sessionId, data).catch(() => {});
    }
  } catch (err) {
    console.error("[Webhook] fireTeamWebhooks error:", err);
  }
}
