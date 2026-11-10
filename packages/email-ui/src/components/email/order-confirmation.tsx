import { Html, Head, Body, Container, Section, Text, Link, Heading, Tailwind } from "@react-email/components";
import React from "react";
import { Layout } from "./layout";

interface OrderConfirmationProps {
  orderNumber?: string;
  customerName?: string;
  dashboardUrl?: string;
}

export const OrderConfirmation = ({ orderNumber, customerName, dashboardUrl }: OrderConfirmationProps) => {
  return (
    <Layout subject="Konfirmasi pesanan Depose">
      <Heading style={{
        margin: "0 0 16px",
        color: "#0f172a",
        fontSize: "22px",
      }}>
        Pesanan dikonfirmasi
      </Heading>

      <Text style={{
        margin: "0 0 16px",
        color: "#334155",
        lineHeight: "1.6",
      }}>
        Pesanan <strong>{orderNumber}</strong> untuk{" "}
        <strong>{customerName}</strong> sudah dikonfirmasi.
      </Text>

      <Text style={{
        margin: "0 0 24px",
        color: "#334155",
        lineHeight: "1.6",
      }}>
        Rincian bisa dilihat di dashboard.
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
          Lihat pesanan
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
