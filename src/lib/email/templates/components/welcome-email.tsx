import { Text, Button, Heading, Hr } from "@react-email/components";
import * as React from "react";
import { BackRowEmailLayout } from "./backrow-layout";

export interface WelcomeEmailProps {
  userName?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://backrow.tv";

export function WelcomeEmail({ userName }: WelcomeEmailProps) {
  const greeting = userName ? `Welcome, ${userName}!` : "Welcome to BackRow!";

  return (
    <BackRowEmailLayout preview="Welcome to BackRow — your movie club awaits">
      <Heading as="h2" style={headingStyle}>
        {greeting}
      </Heading>
      <Text style={introStyle}>
        You&apos;re in. BackRow is where you and your friends run themed film festivals, nominate
        movies, and share critiques — casual or competitive.
      </Text>
      <Hr style={divider} />
      <Text style={featureTitle}>Here&apos;s what you can do:</Text>
      <Text style={featureItem}>
        <strong>Create or join a club</strong> — gather your crew and start watching together
      </Text>
      <Text style={featureItem}>
        <strong>Run film festivals</strong> — themed rounds where members nominate, watch, and rate
        movies
      </Text>
      <Text style={featureItem}>
        <strong>Write critiques</strong> — share your takes and see how your ratings stack up
      </Text>
      <Button href={APP_URL} style={ctaButton}>
        Go to BackRow
      </Button>
    </BackRowEmailLayout>
  );
}

const headingStyle: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "20px",
  fontWeight: 600,
  margin: "0 0 12px",
};

const introStyle: React.CSSProperties = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #e5e5e5",
  margin: "0 0 16px",
};

const featureTitle: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: 600,
  margin: "0 0 12px",
};

const featureItem: React.CSSProperties = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 8px",
  paddingLeft: "8px",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#6B9B6B",
  color: "#ffffff",
  padding: "12px 28px",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 600,
  marginTop: "16px",
};

export default function WelcomeEmailPreview() {
  return <WelcomeEmail userName="Stephen" />;
}
