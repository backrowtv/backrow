import { Resend } from "resend";
import { env } from "@/lib/config/env";

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

  const { data, error } = await resend.emails.send({
    from: options.from || DEFAULT_FROM,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    replyTo: options.replyTo,
    headers: options.headers,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}
