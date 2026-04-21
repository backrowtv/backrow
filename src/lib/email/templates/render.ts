import { render } from "react-email";
import { NotificationEmail, type NotificationEmailProps } from "./components/notification-email";
import {
  ContactNotificationEmail,
  type ContactNotificationEmailProps,
} from "./components/contact-notification-email";
import { WelcomeEmail, type WelcomeEmailProps } from "./components/welcome-email";
import { InviteEmail, type InviteEmailProps } from "./components/invite-email";

export type {
  NotificationEmailProps,
  ContactNotificationEmailProps,
  WelcomeEmailProps,
  InviteEmailProps,
};

export async function notificationEmailHtml(props: NotificationEmailProps): Promise<string> {
  return render(NotificationEmail(props));
}

export async function contactNotificationHtml(
  props: ContactNotificationEmailProps
): Promise<string> {
  return render(ContactNotificationEmail(props));
}

export async function welcomeEmailHtml(props: WelcomeEmailProps): Promise<string> {
  return render(WelcomeEmail(props));
}

export async function inviteEmailHtml(props: InviteEmailProps): Promise<string> {
  return render(InviteEmail(props));
}
