"use server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/config/env";
import { handleActionError } from "@/lib/errors/handler";
import type { ContactFormResult } from "./contact.types";
import { sendEmail } from "@/lib/email/resend";
import { contactNotificationHtml } from "@/lib/email/templates/render";
import { requireHuman } from "@/lib/security/botid";

export async function submitContactForm(formData: FormData): Promise<ContactFormResult> {
  try {
    const human = await requireHuman();
    if (!human.ok) {
      return { success: false, error: human.error };
    }

    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const subject = formData.get("subject")?.toString().trim();
    const message = formData.get("message")?.toString().trim();

    // Validation
    if (!name || name.length === 0) {
      return { success: false, error: "Name is required" };
    }
    if (!email || email.length === 0) {
      return { success: false, error: "Email is required" };
    }
    if (!email.includes("@")) {
      return { success: false, error: "Invalid email address" };
    }
    if (!subject || subject.length === 0) {
      return { success: false, error: "Subject is required" };
    }
    if (!message || message.length === 0) {
      return { success: false, error: "Message is required" };
    }

    // Additional validation
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

    // Insert into contact_submissions table
    const { error } = await supabase.from("contact_submissions").insert({
      name,
      email,
      subject,
      message,
    });

    if (error) {
      const result = handleActionError(error, { action: "submitContactForm" });
      return { success: false, error: result.error };
    }

    // Send email notification (best-effort — don't fail the form submission)
    try {
      const notifyEmail = env.CONTACT_NOTIFY_EMAIL || "support@backrow.dev";
      await sendEmail({
        to: notifyEmail,
        subject: `[BackRow Contact] ${subject}`,
        html: await contactNotificationHtml({ name, email, subject, message }),
        replyTo: email,
      });
    } catch (emailError) {
      // Log but don't fail — the submission is already saved to DB
      console.error("Failed to send contact notification email:", emailError);
    }

    return { success: true };
  } catch (error) {
    const result = handleActionError(error, { action: "submitContactForm" });
    return { success: false, error: result.error };
  }
}
