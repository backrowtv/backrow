import { Html, Head, Body, Container, Section, Img, Text, Link, Preview } from "react-email";
import * as React from "react";

interface BackRowEmailLayoutProps {
  preview?: string;
  unsubscribeUrl?: string;
  children: React.ReactNode;
}

export function BackRowEmailLayout({ preview, unsubscribeUrl, children }: BackRowEmailLayoutProps) {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Body style={body}>
        <Container style={container}>
          {/* Header — wordmark served as PNG by /api/brand/wordmark so Gmail
              and other clients that strip @font-face still render Righteous. */}
          <Section style={header}>
            <Img
              src="https://backrow.tv/wordmark.png"
              alt="BackRow"
              width={150}
              height={40}
              style={logo}
            />
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          {unsubscribeUrl && (
            <Section style={footer}>
              <Text style={footerText}>
                You&apos;re receiving this because you enabled email notifications.{" "}
                <Link href={unsubscribeUrl} style={footerLink}>
                  Manage email preferences
                </Link>
              </Text>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  backgroundColor: "#f5f5f5",
  margin: 0,
  padding: "20px",
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  overflow: "hidden",
  border: "1px solid #e5e5e5",
};

const header: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  padding: "20px 24px",
};

const logo: React.CSSProperties = {
  display: "block",
  height: "40px",
  width: "auto",
  border: 0,
  outline: "none",
  textDecoration: "none",
};

const content: React.CSSProperties = {
  padding: "24px",
};

const footer: React.CSSProperties = {
  borderTop: "1px solid #e5e5e5",
  padding: "16px 24px",
  backgroundColor: "#fafafa",
};

const footerText: React.CSSProperties = {
  color: "#999",
  fontSize: "12px",
  margin: "0",
  lineHeight: "1.5",
};

const footerLink: React.CSSProperties = {
  color: "#6B9B6B",
  textDecoration: "underline",
};
