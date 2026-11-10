import { Html, Head, Body, Container, Section, Text, Link, Heading, Tailwind } from "@react-email/components";
import React from "react";
import { Layout } from "./layout";

interface InquiryProps {
  userName?: string;
  matterName?: string;
  dashboardUrl?: string;
}

export const Inquiry = ({ userName, matterName, dashboardUrl }: InquiryProps) => {
  return (
    <Layout subject="Inquiry baru di Depose">
      <Heading style={{
        margin: "0 0 16px",
        color: "#0f172a",
        fontSize: "22px",
      }}>
        Inquiry baru
      </Heading>

      <Text style={{
        margin: "0 0 16px",
        color: "#334155",
        lineHeight: "1.6",
      }}>
        Pengguna <strong>{userName}</strong> mengajukan inquiry mengenai{" "}
        <strong>{matterName}</strong>.
      </Text>

      <Text style={{
        margin: "0 0 24px",
        color: "#334155",
        lineHeight: "1.6",
      }}>
        Silakan tinjau detailnya di dashboard.
      </Text>

      <Text style={{
        margin: "0 0 24px",
        color: "#334155",
        lineHeight: "1.6",
      }}>
        <Link href={dashboardUrl ?? ""} style={{
          display: "inline-block",
          backgroundColor: "#2563eb",
          color: "#ffffff",
          textDecoration: "none",
          padding: "12px 24px",
          borderRadius: "8px",
          fontWeight: 600,
        }}>
          Lihat di dashboard
        </Link>
      </Text>

      <Text style={{
        margin: 0,
        color: "#64748b",
        fontSize: "13px",
      }}>
        Email otomatis dari Depose.
      </Text>
    </Layout>
  );
};
