import { renderTemplate } from "./render-template.js";

export type EmailTemplate =
  | "reset-password"
  | "verify-email"
  | "welcome"
  | "inquiry"
  | "order-confirmation";

export { renderTemplate };

export async function renderEmailHtml(
  template: EmailTemplate,
  ctx: Record<string, unknown>,
): Promise<string> {
  return renderTemplate(template, ctx);
}
