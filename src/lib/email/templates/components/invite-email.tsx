import { Text, Button, Heading } from "@react-email/components";
import * as React from "react";
import { BackRowEmailLayout } from "./backrow-layout";

export interface InviteEmailProps {
  clubName: string;
  clubDescription?: string;
  inviterName?: string;
  inviteUrl: string;
  isPrivate?: boolean;
}

export function InviteEmail({
  clubName,
  clubDescription,
  inviterName,
  inviteUrl,
  isPrivate,
}: InviteEmailProps) {
  const invitedBy = inviterName ? `${inviterName} invited you` : "You've been invited";

  return (
    <BackRowEmailLayout preview={`${invitedBy} to join ${clubName} on BackRow`}>
      <Text style={greetingStyle}>Hi there,</Text>
      <Heading as="h2" style={titleStyle}>
        {invitedBy} to join {clubName}
      </Heading>
      <Text style={messageStyle}>
        {clubDescription ||
          "BackRow is where friends run themed film festivals, nominate movies, and share critiques together."}
      </Text>
      <Button href={inviteUrl} style={ctaButton}>
        Join {clubName}
      </Button>
      {isPrivate && (
        <Text style={expiryStyle}>This invite link expires in 7 days.</Text>
      )}
      <Text style={footerNote}>
        BackRow — Movie clubs, done right.
      </Text>
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

const expiryStyle: React.CSSProperties = {
  color: "#999",
  fontSize: "12px",
  margin: "16px 0 0",
};

const footerNote: React.CSSProperties = {
  color: "#999",
  fontSize: "12px",
  margin: "24px 0 0",
  borderTop: "1px solid #e5e5e5",
  paddingTop: "16px",
};
