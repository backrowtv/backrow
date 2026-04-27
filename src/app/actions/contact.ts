"use server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/config/env";
import { handleActionError } from "@/lib/errors/handler";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { isValidEmail } from "@/lib/security/validators";
import { sanitizeForStorage } from "@/lib/security/sanitize";
import type { ContactFormResult } from "./contact.types";
import { sendEmail } from "@/lib/email/resend";
import { contactNotificationHtml } from "@/lib/email/templates/render";

export async function submitContactForm(formData: FormData): Promise<ContactFormResult> {
  // Public unauthenticated endpoint — layered rate limit blocks scripted floods
  // (3/min) and slow-drip spam (20/hr). Higher than typical to absorb shared-NAT
  // (offices, university Wi-Fi).
  const burst = await actionRateLimit("submitContactForm:burst", {
    limit: 3,
    windowMs: 60_000,
  });
  if (!burst.success) return { success: false, error: burst.error };
  const sustained = await actionRateLimit("submitContactForm:hourly", {
    limit: 20,
    windowMs: 60 * 60_000,
  });
  if (!sustained.success) return { success: false, error: sustained.error };

  try {
    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const subject = formData.get("subject")?.toString().trim();
    const message = formData.get("message")?.toString().trim();

    if (!name || name.length === 0) {
      return { success: false, error: "Name is required" };
    }
    if (!email || email.length === 0) {
      return { success: false, error: "Email is required" };
    }
    if (!isValidEmail(email)) {
      return { success: false, error: "Invalid email address" };
    }
    if (!subject || subject.length === 0) {
      return { success: false, error: "Subject is required" };
    }
    if (!message || message.length === 0) {
      return { success: false, error: "Message is required" };
    }

    if (name.length > 200) {
      return { success: false, error: "Name is too long" };
    }
    if (email.length > 200) {
      return { success: false, error: "Email is too long" };
    }
    if (subject.length > 200) {
      return { success: false, error: "Subject is too long" };
    }
    if (message.length > 2000) {
      return { success: false, error: "Message is too long" };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("contact_submissions").insert({
      name: sanitizeForStorage(name),
      email,
      subject: sanitizeForStorage(subject),
      message: sanitizeForStorage(message),
    });

    if (error) {
      const result = handleActionError(error, { action: "submitContactForm" });
      return { success: false, error: result.error };
    }

    try {
      const notifyEmail = env.CONTACT_NOTIFY_EMAIL || "support@backrow.dev";
      await sendEmail({
        to: notifyEmail,
        subject: `[BackRow Contact] ${subject}`,
        html: await contactNotificationHtml({ name, email, subject, message }),
        replyTo: email,
      });
    } catch (emailError) {
      console.error("Failed to send contact notification email:", emailError);
    }

    return { success: true };
  } catch (error) {
    const result = handleActionError(error, { action: "submitContactForm" });
    return { success: false, error: result.error };
  }
}
