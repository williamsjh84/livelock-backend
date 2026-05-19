/**
 * LiveLock — Email Service
 * Sends transactional emails via Resend.
 * All email functions are non-throwing: they log and return false on failure
 * so a broken email service never blocks a successful signup.
 */
import { Resend } from "resend";
import { ENV } from "./_core/env";

// Lazily initialise the client so tests can mock the env
function getResendClient(): Resend | null {
  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY is not set — emails will not be sent.");
    return null;
  }
  return new Resend(ENV.resendApiKey);
}

// ── HTML Template ─────────────────────────────────────────────────────────────

function buildEarlyAccessConfirmationHtml(firstName: string, company: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're on the LiveLock waitlist</title>
</head>
<body style="margin:0;padding:0;background-color:#0A1628;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1628;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#00C9B1,#0077B6);display:inline-flex;align-items:center;justify-content:center;">
                      <!-- Shield icon (inline SVG) -->
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L3 7V12C3 16.55 6.84 20.74 12 22C17.16 20.74 21 16.55 21 12V7L12 2Z" fill="white"/>
                      </svg>
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">LiveLock</p>
                    <p style="margin:0;font-size:9px;color:#00C9B1;letter-spacing:2px;text-transform:uppercase;">Human Verification Layer</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#0F1E35;border-radius:20px;border:1px solid rgba(255,255,255,0.07);padding:40px 36px;">

              <!-- Check icon -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <div style="width:64px;height:64px;border-radius:50%;background-color:rgba(0,201,177,0.1);border:2px solid rgba(0,201,177,0.3);display:inline-flex;align-items:center;justify-content:center;">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="#00C9B1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Headline -->
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#FFFFFF;text-align:center;letter-spacing:-0.5px;">
                You're on the list, ${firstName}.
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.5);text-align:center;line-height:1.6;">
                Thanks for requesting early access for <strong style="color:rgba(255,255,255,0.75);">${company}</strong>.<br/>
                We'll be in touch within 2 business days.
              </p>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:28px;"></div>

              <!-- What happens next -->
              <p style="margin:0 0 16px;font-size:10px;font-weight:600;color:rgba(0,201,177,0.7);letter-spacing:2px;text-transform:uppercase;">
                What happens next
              </p>

              <!-- Step 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td width="28" valign="top">
                    <div style="width:20px;height:20px;border-radius:50%;background-color:rgba(0,201,177,0.12);border:1px solid rgba(0,201,177,0.3);text-align:center;line-height:20px;">
                      <span style="font-size:9px;font-weight:700;color:#00C9B1;">1</span>
                    </div>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">We review your submission within 2 business days</p>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td width="28" valign="top">
                    <div style="width:20px;height:20px;border-radius:50%;background-color:rgba(0,201,177,0.12);border:1px solid rgba(0,201,177,0.3);text-align:center;line-height:20px;">
                      <span style="font-size:9px;font-weight:700;color:#00C9B1;">2</span>
                    </div>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">You receive a private invite link for your team</p>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td width="28" valign="top">
                    <div style="width:20px;height:20px;border-radius:50%;background-color:rgba(0,201,177,0.12);border:1px solid rgba(0,201,177,0.3);text-align:center;line-height:20px;">
                      <span style="font-size:9px;font-weight:700;color:#00C9B1;">3</span>
                    </div>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">Onboard up to 5 team members in under 10 minutes</p>
                  </td>
                </tr>
              </table>

              <!-- Step 4 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td width="28" valign="top">
                    <div style="width:20px;height:20px;border-radius:50%;background-color:rgba(0,201,177,0.12);border:1px solid rgba(0,201,177,0.3);text-align:center;line-height:20px;">
                      <span style="font-size:9px;font-weight:700;color:#00C9B1;">4</span>
                    </div>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">Run your first live verification session</p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:28px;"></div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://livelock.io" style="display:inline-block;padding:13px 32px;background-color:#00C9B1;color:#0A1628;font-size:13px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.2px;">
                      See the Live Demo →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.2);">
                LiveLock · Human Verification Layer · livelock.io
              </p>
              <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.15);">
                You're receiving this because you requested early access. No spam, ever.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEarlyAccessConfirmationText(firstName: string, company: string): string {
  return `Hi ${firstName},

You're on the LiveLock waitlist!

Thanks for requesting early access for ${company}. We'll be in touch within 2 business days.

What happens next:
1. We review your submission within 2 business days
2. You receive a private invite link for your team
3. Onboard up to 5 team members in under 10 minutes
4. Run your first live verification session

See the live demo at: https://livelock.io

—
LiveLock · Human Verification Layer · livelock.io
You're receiving this because you requested early access.
`;
}

// ── Password Reset Template ───────────────────────────────────────────────────

function buildPasswordResetHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your LiveLock password</title>
</head>
<body style="margin:0;padding:0;background-color:#0A1628;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1628;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;padding-right:12px;">
                <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#00C9B1,#0077B6);display:inline-flex;align-items:center;justify-content:center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7V12C3 16.55 6.84 20.74 12 22C17.16 20.74 21 16.55 21 12V7L12 2Z" fill="white"/></svg>
                </div>
              </td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">LiveLock</p>
                <p style="margin:0;font-size:9px;color:#00C9B1;letter-spacing:2px;text-transform:uppercase;">Human Verification Layer</p>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#0F1E35;border-radius:20px;border:1px solid rgba(255,255,255,0.07);padding:40px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td align="center">
                <div style="width:64px;height:64px;border-radius:50%;background-color:rgba(0,119,182,0.15);border:2px solid rgba(0,119,182,0.4);display:inline-flex;align-items:center;justify-content:center;">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#0077B6" stroke-width="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#0077B6" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
              </td></tr>
            </table>
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#FFFFFF;text-align:center;letter-spacing:-0.5px;">Reset your password</h1>
            <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.5);text-align:center;line-height:1.6;">
              We received a request to reset your LiveLock password.<br/>Click the button below — the link expires in <strong style="color:rgba(255,255,255,0.7);">1 hour</strong>.
            </p>
            <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:28px;"></div>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td align="center">
                <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background-color:#00C9B1;color:#0A1628;font-size:14px;font-weight:700;text-decoration:none;border-radius:12px;">Reset Password →</a>
              </td></tr>
            </table>
            <p style="margin:0 0 16px;font-size:11px;color:rgba(255,255,255,0.25);text-align:center;">
              Or copy this link: <span style="color:rgba(0,201,177,0.6);word-break:break-all;">${resetUrl}</span>
            </p>
            <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:16px;"></div>
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);text-align:center;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:28px;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">LiveLock · Human Verification Layer · livelock.io</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetText(resetUrl: string): string {
  return `Reset your LiveLock password

We received a request to reset your password. The link below expires in 1 hour.

${resetUrl}

If you didn't request this, ignore this email — your password won't change.

—
LiveLock · livelock.io
`;
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<boolean> {
  const client = getResendClient();
  if (!client) return false;
  try {
    const { error } = await client.emails.send({
      from: "LiveLock <team@livelock.io>",
      to: [toEmail],
      subject: "Reset your LiveLock password",
      html: buildPasswordResetHtml(resetUrl),
      text: buildPasswordResetText(resetUrl),
    });
    if (error) { console.warn("[Email] Password reset error:", error); return false; }
    console.info(`[Email] Password reset sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send password reset:", err);
    return false;
  }
}

// ── Verification Notification Template ───────────────────────────────────────

function buildVerificationNotificationHtml(initiatorName: string, actionContext: string | null): string {
  const actionLine = actionContext
    ? `<p style="margin:0 0 20px;font-size:13px;color:rgba(255,255,255,0.4);text-align:center;line-height:1.5;">Action: <strong style="color:rgba(255,255,255,0.65);">${actionContext}</strong></p>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Verification request</title></head>
<body style="margin:0;padding:0;background-color:#0A1628;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1628;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;padding-right:12px;">
                <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#00C9B1,#0077B6);display:inline-flex;align-items:center;justify-content:center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7V12C3 16.55 6.84 20.74 12 22C17.16 20.74 21 16.55 21 12V7L12 2Z" fill="white"/></svg>
                </div>
              </td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">LiveLock</p>
                <p style="margin:0;font-size:9px;color:#00C9B1;letter-spacing:2px;text-transform:uppercase;">Human Verification Layer</p>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#0F1E35;border-radius:20px;border:1px solid rgba(255,255,255,0.07);padding:40px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td align="center">
                <div style="width:64px;height:64px;border-radius:50%;background-color:rgba(0,201,177,0.1);border:2px solid rgba(0,201,177,0.3);display:inline-flex;align-items:center;justify-content:center;">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#00C9B1" stroke-width="2" stroke-linejoin="round"/></svg>
                </div>
              </td></tr>
            </table>
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#FFFFFF;text-align:center;letter-spacing:-0.5px;">
              <span style="color:#00C9B1;">${initiatorName}</span> wants to verify you
            </h1>
            <p style="margin:0 0 16px;font-size:14px;color:rgba(255,255,255,0.5);text-align:center;line-height:1.6;">
              Open LiveLock and confirm their identity. The session expires in <strong style="color:rgba(255,255,255,0.7);">90 seconds</strong>.
            </p>
            ${actionLine}
            <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:28px;"></div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="https://livelock.io/app/verify" style="display:inline-block;padding:14px 36px;background-color:#00C9B1;color:#0A1628;font-size:14px;font-weight:700;text-decoration:none;border-radius:12px;">Verify Now →</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:28px;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">LiveLock · Human Verification Layer · livelock.io</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationNotificationEmail(
  toEmail: string,
  initiatorName: string,
  actionContext: string | null,
): Promise<boolean> {
  const client = getResendClient();
  if (!client) return false;
  try {
    const { error } = await client.emails.send({
      from: "LiveLock <team@livelock.io>",
      to: [toEmail],
      subject: `${initiatorName} wants to verify you on LiveLock`,
      html: buildVerificationNotificationHtml(initiatorName, actionContext),
      text: `${initiatorName} wants to verify you on LiveLock.\n\nOpen the app to respond — the session expires in 90 seconds.\n\nhttps://livelock.io/app/verify\n\n— LiveLock`,
    });
    if (error) { console.warn("[Email] Verification notification error:", error); return false; }
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send verification notification:", err);
    return false;
  }
}

// ── Team Invite Template ──────────────────────────────────────────────────────

function buildTeamInviteHtml(inviterName: string, teamName: string, inviteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to join ${teamName} on LiveLock</title>
</head>
<body style="margin:0;padding:0;background-color:#0A1628;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1628;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#00C9B1,#0077B6);display:inline-flex;align-items:center;justify-content:center;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L3 7V12C3 16.55 6.84 20.74 12 22C17.16 20.74 21 16.55 21 12V7L12 2Z" fill="white"/>
                      </svg>
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">LiveLock</p>
                    <p style="margin:0;font-size:9px;color:#00C9B1;letter-spacing:2px;text-transform:uppercase;">Human Verification Layer</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#0F1E35;border-radius:20px;border:1px solid rgba(255,255,255,0.07);padding:40px 36px;">

              <!-- Shield icon -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <div style="width:64px;height:64px;border-radius:50%;background-color:rgba(0,201,177,0.1);border:2px solid rgba(0,201,177,0.3);display:inline-flex;align-items:center;justify-content:center;">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L3 7V12C3 16.55 6.84 20.74 12 22C17.16 20.74 21 16.55 21 12V7L12 2Z" fill="white"/>
                        <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Headline -->
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#FFFFFF;text-align:center;letter-spacing:-0.5px;">
                You've been invited to join<br/><span style="color:#00C9B1;">${teamName}</span>
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.5);text-align:center;line-height:1.6;">
                <strong style="color:rgba(255,255,255,0.75);">${inviterName}</strong> has invited you to their LiveLock team.<br/>
                LiveLock protects against social-engineering attacks by requiring human voice verification before high-risk actions.
              </p>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:28px;"></div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display:inline-block;padding:14px 36px;background-color:#00C9B1;color:#0A1628;font-size:14px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.2px;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 28px;font-size:11px;color:rgba(255,255,255,0.25);text-align:center;">
                Or copy this link into your browser:<br/>
                <span style="color:rgba(0,201,177,0.6);word-break:break-all;">${inviteUrl}</span>
              </p>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:20px;"></div>

              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);text-align:center;">
                This invite expires in 7 days. If you weren't expecting this, you can safely ignore it.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.2);">
                LiveLock · Human Verification Layer · livelock.io
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildTeamInviteText(inviterName: string, teamName: string, inviteUrl: string): string {
  return `${inviterName} has invited you to join ${teamName} on LiveLock.

LiveLock protects against social-engineering attacks by requiring human voice verification before high-risk actions.

Accept your invitation here:
${inviteUrl}

This invite expires in 7 days.

—
LiveLock · Human Verification Layer · livelock.io
`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface TeamInviteEmailParams {
  toEmail: string;
  inviterName: string;
  teamName: string;
  inviteUrl: string;
}

/**
 * Sends a branded team invite email to the invited address.
 * Returns true on success, false on any failure (non-throwing).
 */
export async function sendTeamInviteEmail(params: TeamInviteEmailParams): Promise<boolean> {
  const client = getResendClient();
  if (!client) return false;

  const { toEmail, inviterName, teamName, inviteUrl } = params;

  try {
    const { error } = await client.emails.send({
      from: "LiveLock <team@livelock.io>",
      to: [toEmail],
      subject: `${inviterName} invited you to join ${teamName} on LiveLock`,
      html: buildTeamInviteHtml(inviterName, teamName, inviteUrl),
      text: buildTeamInviteText(inviterName, teamName, inviteUrl),
    });

    if (error) {
      console.warn("[Email] Resend returned an error sending invite:", error);
      return false;
    }

    console.info(`[Email] Team invite sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send team invite email:", err);
    return false;
  }
}

// ── Welcome Email Template ────────────────────────────────────────────────────

function buildWelcomeHtml(displayName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to LiveLock</title>
</head>
<body style="margin:0;padding:0;background-color:#0A1628;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1628;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#00C9B1,#0077B6);display:inline-flex;align-items:center;justify-content:center;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L3 7V12C3 16.55 6.84 20.74 12 22C17.16 20.74 21 16.55 21 12V7L12 2Z" fill="white"/>
                      </svg>
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">LiveLock</p>
                    <p style="margin:0;font-size:9px;color:#00C9B1;letter-spacing:2px;text-transform:uppercase;">Human Verification Layer</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#0F1E35;border-radius:20px;border:1px solid rgba(255,255,255,0.07);padding:40px 36px;">

              <!-- Check icon -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <div style="width:64px;height:64px;border-radius:50%;background-color:rgba(0,201,177,0.1);border:2px solid rgba(0,201,177,0.3);display:inline-flex;align-items:center;justify-content:center;">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="#00C9B1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Headline -->
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#FFFFFF;text-align:center;letter-spacing:-0.5px;">
                Welcome to LiveLock, ${displayName}.
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.5);text-align:center;line-height:1.6;">
                Your account is set up and ready to go.<br/>
                You can now verify and be verified by your teammates.
              </p>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:28px;"></div>

              <!-- What's next -->
              <p style="margin:0 0 16px;font-size:10px;font-weight:600;color:rgba(0,201,177,0.7);letter-spacing:2px;text-transform:uppercase;">
                Get started
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td width="28" valign="top">
                    <div style="width:20px;height:20px;border-radius:50%;background-color:rgba(0,201,177,0.12);border:1px solid rgba(0,201,177,0.3);text-align:center;line-height:20px;">
                      <span style="font-size:9px;font-weight:700;color:#00C9B1;">1</span>
                    </div>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">Go to your dashboard and create or join a team</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td width="28" valign="top">
                    <div style="width:20px;height:20px;border-radius:50%;background-color:rgba(0,201,177,0.12);border:1px solid rgba(0,201,177,0.3);text-align:center;line-height:20px;">
                      <span style="font-size:9px;font-weight:700;color:#00C9B1;">2</span>
                    </div>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">Invite teammates so they can verify you</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td width="28" valign="top">
                    <div style="width:20px;height:20px;border-radius:50%;background-color:rgba(0,201,177,0.12);border:1px solid rgba(0,201,177,0.3);text-align:center;line-height:20px;">
                      <span style="font-size:9px;font-weight:700;color:#00C9B1;">3</span>
                    </div>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">Run your first live verification — takes under 10 seconds</p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:28px;"></div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://livelock.io/app/dashboard" style="display:inline-block;padding:13px 32px;background-color:#00C9B1;color:#0A1628;font-size:13px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.2px;">
                      Go to Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.2);">
                LiveLock · Human Verification Layer · livelock.io
              </p>
              <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.15);">
                You're receiving this because you just created a LiveLock account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWelcomeText(displayName: string): string {
  return `Welcome to LiveLock, ${displayName}!

Your account is set up and ready to go. You can now verify and be verified by your teammates.

Get started:
1. Go to your dashboard and create or join a team
2. Invite teammates so they can verify you
3. Run your first live verification — takes under 10 seconds

Go to your dashboard: https://livelock.io/app/dashboard

—
LiveLock · Human Verification Layer · livelock.io
`;
}

export interface WelcomeEmailParams {
  toEmail: string;
  displayName: string;
}

/**
 * Sends a welcome email after a new account is created.
 * Returns true on success, false on any failure (non-throwing).
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  const client = getResendClient();
  if (!client) return false;

  const { toEmail, displayName } = params;

  try {
    const { error } = await client.emails.send({
      from: "LiveLock <team@livelock.io>",
      to: [toEmail],
      subject: `Welcome to LiveLock, ${displayName} 🔒`,
      html: buildWelcomeHtml(displayName),
      text: buildWelcomeText(displayName),
    });

    if (error) {
      console.warn("[Email] Resend error sending welcome email:", error);
      return false;
    }

    console.info(`[Email] Welcome email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send welcome email:", err);
    return false;
  }
}

export interface EarlyAccessEmailParams {
  toEmail: string;
  firstName: string;
  company: string;
}

/**
 * Sends a branded confirmation email to a new Early Access signup.
 * Returns true on success, false on any failure (non-throwing).
 */
export async function sendEarlyAccessConfirmation(
  params: EarlyAccessEmailParams
): Promise<boolean> {
  const client = getResendClient();
  if (!client) return false;

  const { toEmail, firstName, company } = params;

  try {
    const { error } = await client.emails.send({
      from: "LiveLock <team@livelock.io>",
      to: [toEmail],
      subject: `You're on the LiveLock waitlist, ${firstName} 🔒`,
      html: buildEarlyAccessConfirmationHtml(firstName, company),
      text: buildEarlyAccessConfirmationText(firstName, company),
    });

    if (error) {
      console.warn("[Email] Resend returned an error:", error);
      return false;
    }

    console.info(`[Email] Confirmation sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send confirmation email:", err);
    return false;
  }
}
