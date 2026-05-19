/**
 * LiveLock — SMS Notifications via Twilio
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars.
 */
import twilio from "twilio";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.warn("[SMS] Twilio credentials not set — SMS notifications disabled.");
    return null;
  }
  return twilio(sid, token);
}

/**
 * Send an SMS message.
 * Returns true on success, false on any failure (non-throwing).
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    console.warn("[SMS] TWILIO_PHONE_NUMBER not set.");
    return false;
  }

  try {
    await client.messages.create({ from, to, body });
    console.info(`[SMS] Sent to ${to.slice(0, 6)}***`);
    return true;
  } catch (err: any) {
    console.warn("[SMS] Failed to send:", err?.message ?? err);
    return false;
  }
}
