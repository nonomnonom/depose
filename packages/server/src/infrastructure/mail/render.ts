import { renderEmail, type RenderEmailOptions } from "@depose/email-ui/render";
import React from "react";
import {
  ResetPassword,
  VerifyEmail,
  Welcome,
  Inquiry,
  OrderConfirmation,
} from "@depose/email-ui";

export type EmailTemplate =
  | "reset-password"
  | "verify-email"
  | "welcome"
  | "inquiry"
  | "order-confirmation";

export async function renderTemplate(
  template: EmailTemplate,
  ctx: Record<string, unknown>,
): Promise<string> {
  const component = {
    "reset-password": React.createElement(ResetPassword, ctx as React.Attributes),
    "verify-email": React.createElement(VerifyEmail, ctx as React.Attributes),
    welcome: React.createElement(Welcome, ctx as React.Attributes),
    inquiry: React.createElement(Inquiry, ctx as React.Attributes),
    "order-confirmation": React.createElement(
      OrderConfirmation,
      ctx as React.Attributes,
    ),
  }[template];

  if (!component) {
    throw new Error(`Unknown email template: ${template}`);
  }

  const html = await renderEmail({ component } as RenderEmailOptions);
  return html;
}
