import { Resend } from "resend";
import { env } from "@/lib/config/env";
import { retryWithBackoff } from "@/lib/retry";

// Lazy singleton — only created when first used
let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

const DEFAULT_FROM = env.RESEND_FROM_EMAIL || "BackRow <noreply@backrow.tv>";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(options: SendEmailOptions) {
  const resend = getResend();

  try {
    return await retryWithBackoff(async () => {
      const { data, error } = await resend.emails.send({
        from: options.from || DEFAULT_FROM,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
        headers: options.headers,
      });
      if (error) throw new Error(`Email send failed: ${error.message}`);
      return data;
    });
  } catch (err) {
    console.error("Failed to send email:", err);
    throw err;
  }
}

/**
 * Remove a user's email from the configured Resend audience. Used during
 * GDPR account soft-delete so a user's email doesn't linger in Resend after
 * they've requested deletion from BackRow.
 *
 * No-op when RESEND_API_KEY or RESEND_AUDIENCE_ID is unset (local dev, or
 * projects that only use transactional email). Swallows 404 and other
 * errors by design — we log and continue so a Resend outage never blocks
 * account deletion.
 */
export async function removeContactByEmail(email: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.RESEND_AUDIENCE_ID) return;
  try {
    const resend = getResend();
    await resend.contacts.remove({
      email,
      audienceId: env.RESEND_AUDIENCE_ID,
    });
  } catch (err) {
    console.error("[resend] removeContactByEmail failed (continuing):", err);
  }
}
