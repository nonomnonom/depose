import { Html, Head, Body, Container, Section, Text, Link, Heading, Tailwind } from "@react-email/components";
import React from "react";
import { Layout } from "./layout";

interface ResetPasswordProps {
  name?: string;
  url?: string;
}

export const ResetPassword = ({ name, url }: ResetPasswordProps) => {
  return (
    <Layout subject="Reset your Depose password">
      <Heading style={{
        margin: "0 0 16px",
        color: "#0f172a",
        fontSize: "22px",
      }}>
        Atur ulang kata sandi
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
        Klik tautan di bawah untuk mengatur ulang kata sandi Anda.
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
        Tautan ini akan kadaluarsa dalam 1 jam.
      </Text>
    </Layout>
  );
};
