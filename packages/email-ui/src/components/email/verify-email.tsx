import { Html, Head, Body, Container, Section, Text, Link, Heading, Tailwind } from "@react-email/components";
import React from "react";
import { Layout } from "./layout";

interface VerifyEmailProps {
  name?: string;
  url?: string;
}

export const VerifyEmail = ({ name, url }: VerifyEmailProps) => {
  return (
    <Layout subject="Verify your email for Depose">
      <Heading style={{
        margin: "0 0 16px",
        color: "#0f172a",
        fontSize: "22px",
      }}>
        Verifikasi email Anda
      </Heading>

      <Text style={{
        margin: "0 0 16px",
        color: "#334155",
        lineHeight: "1.6",
      }}>
        Hi {name ?? "Teman"},
      </Text>

      <Text style={{
        margin: "0 0 24px",
        color: "#334155",
        lineHeight: "1.6",
      }}>
        Klik tautan di bawah untuk memverifikasi email Anda.
      </Text>

      <Text style={{
        margin: "0 0 24px",
        color: "#334155",
        lineHeight: "1.6",
      }}>
        <Link href={url ?? ""} style={{
          color: "#2563eb",
          textDecoration: "underline",
        }}>
          {url}
        </Link>
      </Text>

      <Text style={{
        margin: 0,
        color: "#64748b",
        fontSize: "13px",
      }}>
        Tautan ini akan kadaluarsa dalam 24 jam.
      </Text>
    </Layout>
  );
};
