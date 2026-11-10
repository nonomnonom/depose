import { Html, Head, Body, Container, Section, Text, Link, Heading, Tailwind } from "@react-email/components";
import React from "react";
import { Layout } from "./layout";

interface WelcomeProps {
  name?: string;
  dashboardUrl?: string;
}

export const Welcome = ({ name, dashboardUrl }: WelcomeProps) => {
  return (
    <Layout subject="Selamat datang di Depose">
      <Heading style={{
        margin: "0 0 16px",
        color: "#0f172a",
        fontSize: "22px",
      }}>
        Selamat datang, {name}!
      </Heading>

      <Text style={{
        margin: "0 0 20px",
        color: "#334155",
        lineHeight: "1.6",
      }}>
        Terima kasih telah bergabung dengan Depose. Akun Anda sudah siap digunakan.
      </Text>

      <Text style={{
        margin: "0 0 24px",
        color: "#334155",
        lineHeight: "1.6",
      }}>
        Anda bisa langsung membuat{" "}
        <strong>firma</strong>, mengimpor{" "}
        <strong>dokumen</strong>, dan melihat{" "}
        <strong>fakta</strong> yang berhasil diekstrak.
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
          Ke dashboard
        </Link>
      </Text>

      <Text style={{
        margin: 0,
        color: "#64748b",
        fontSize: "13px",
      }}>
        Jika Anda tidak meminta ini, abaikan email ini.
      </Text>
    </Layout>
  );
};
