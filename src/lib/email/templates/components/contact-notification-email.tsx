import { Text, Link, Row, Column, Section, Hr } from "@react-email/components";
import * as React from "react";
import { BackRowEmailLayout } from "./backrow-layout";

export interface ContactNotificationEmailProps {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export function ContactNotificationEmail({
  name,
  email,
  subject,
  message,
}: ContactNotificationEmailProps) {
  return (
    <BackRowEmailLayout preview={`Contact form: ${subject}`}>
      <Row style={fieldRow}>
        <Column style={labelCol}>From</Column>
        <Column style={valueCol}>
          <Text style={valueBold}>{name}</Text>
        </Column>
      </Row>
      <Row style={fieldRow}>
        <Column style={labelCol}>Email</Column>
        <Column style={valueCol}>
          <Link href={`mailto:${email}`} style={emailLink}>
            {email}
          </Link>
        </Column>
      </Row>
      <Row style={fieldRow}>
        <Column style={labelCol}>Subject</Column>
        <Column style={valueCol}>
          <Text style={valueText}>{subject}</Text>
        </Column>
      </Row>
      <Hr style={divider} />
      <Section>
        <Text style={messageLabel}>Message</Text>
        <Text style={messageBody}>{message}</Text>
      </Section>
    </BackRowEmailLayout>
  );
}

const fieldRow: React.CSSProperties = {
  marginBottom: "4px",
};

const labelCol: React.CSSProperties = {
  width: "80px",
  padding: "8px 0",
  color: "#666",
  fontSize: "13px",
  verticalAlign: "top",
};

const valueCol: React.CSSProperties = {
  padding: "8px 0",
  fontSize: "13px",
};

const valueBold: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "13px",
  fontWeight: 600,
  margin: "0",
};

const valueText: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "13px",
  margin: "0",
};

const emailLink: React.CSSProperties = {
  color: "#6B9B6B",
  fontSize: "13px",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #e5e5e5",
  margin: "8px 0 16px",
};

const messageLabel: React.CSSProperties = {
  color: "#666",
  fontSize: "12px",
  margin: "0 0 8px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const messageBody: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
  whiteSpace: "pre-wrap",
};

export default function ContactNotificationEmailPreview() {
  return (
    <ContactNotificationEmail
      name="Jane Doe"
      email="jane@example.com"
      subject="Feature request"
      message="Hey! I love BackRow. Would be great if you could add a way to create wishlists for movies we want to watch together."
    />
  );
}
