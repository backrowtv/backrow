import { Text, Button, Heading } from "@react-email/components";
import * as React from "react";
import { BackRowEmailLayout } from "./backrow-layout";

export interface NotificationEmailProps {
  userName?: string;
  title: string;
  message: string;
  link?: string;
  ctaLabel?: string;
  unsubscribeUrl: string;
}

export function NotificationEmail({
  userName,
  title,
  message,
  link,
  ctaLabel,
  unsubscribeUrl,
}: NotificationEmailProps) {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  return (
    <BackRowEmailLayout preview={title} unsubscribeUrl={unsubscribeUrl}>
      <Text style={greetingStyle}>{greeting}</Text>
      <Heading as="h2" style={titleStyle}>
        {title}
      </Heading>
      <Text style={messageStyle}>{message}</Text>
      {link && ctaLabel && (
        <Button href={link} style={ctaButton}>
          {ctaLabel}
        </Button>
      )}
    </BackRowEmailLayout>
  );
}

const greetingStyle: React.CSSProperties = {
  color: "#666",
  fontSize: "14px",
  margin: "0 0 16px",
};

const titleStyle: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: 600,
  margin: "0 0 8px",
};

const messageStyle: React.CSSProperties = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#6B9B6B",
  color: "#ffffff",
  padding: "10px 24px",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 600,
};

export default function NotificationEmailPreview() {
  return (
    <NotificationEmail
      userName="Stephen"
      title="New Festival: Horror Month"
      message="A new festival has been created in your club. Check it out and start nominating movies!"
      link="https://backrow.tv/club/test/festival/horror-month"
      ctaLabel="View Festival"
      unsubscribeUrl="https://backrow.tv/profile/settings/notifications"
    />
  );
}
