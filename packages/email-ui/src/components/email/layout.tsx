import { Html, Head, Body, Container, Hr, Section, Text, Link, Tailwind } from "@react-email/components";
import React from "react";

interface LayoutProps {
  children: React.ReactNode;
  subject?: string;
}

export const Layout = ({ children, subject }: LayoutProps) => {
  return (
    <Html>
      <Head />
      <Body style={{
        margin: 0,
        padding: 0,
        backgroundColor: "#f5f7fa",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <Container style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          overflow: "hidden",
          maxWidth: "600px",
          margin: "40px auto",
        }}>
          <Section style={{
            padding: "40px 48px",
            textAlign: "center",
            backgroundColor: "#0f172a",
          }}>
            <Text style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "24px",
              fontWeight: 700,
            }}>
              Depose
            </Text>
          </Section>

          <Section style={{ padding: "40px 48px" }}>
            {children}
          </Section>

          <Section style={{
            padding: "24px 48px",
            backgroundColor: "#f8fafc",
            textAlign: "center",
            color: "#64748b",
            fontSize: "13px",
          }}>
            <Text style={{ margin: 0 }}>Email otomatis dari Depose.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
