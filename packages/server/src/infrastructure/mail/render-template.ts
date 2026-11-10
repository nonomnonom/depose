import type { EmailTemplate } from "./render.js";

const TEMPLATES: Record<EmailTemplate, (ctx: Record<string, unknown>) => string> = {
  "reset-password": (ctx) => `<!DOCTYPE html>
<html>
<head><title>Reset Password</title></head>
<body>
  <h1>Reset Password</h1>
  <p>Click the link below to reset your password:</p>
  <a href="${ctx.link}">Reset Password</a>
</body>
</html>`,

  "verify-email": (ctx) => `<!DOCTYPE html>
<html>
<head><title>Verify Email</title></head>
<body>
  <h1>Verify Email</h1>
  <p>Click the link below to verify your email:</p>
  <a href="${ctx.link}">Verify Email</a>
</body>
</html>`,

  welcome: (ctx) => `<!DOCTYPE html>
<html>
<head><title>Welcome</title></head>
<body>
  <h1>Welcome to Depose</h1>
  <p>Hi ${ctx.name},</p>
  <p>Thank you for signing up!</p>
</body>
</html>`,

  inquiry: (ctx) => `<!DOCTYPE html>
<html>
<head><title>Inquiry</title></head>
<body>
  <h1>Inquiry Received</h1>
  <p>We received your inquiry. We'll get back to you soon.</p>
</body>
</html>`,

  "order-confirmation": (ctx) => `<!DOCTYPE html>
<html>
<head><title>Order Confirmation</title></head>
<body>
  <h1>Order Confirmed</h1>
  <p>Your order #${ctx.orderId} has been confirmed.</p>
</body>
</html>`,
};

export async function renderTemplate(
  template: EmailTemplate,
  ctx: Record<string, unknown>,
): Promise<string> {
  const renderFn = TEMPLATES[template];
  if (!renderFn) {
    throw new Error(`Unknown email template: ${template}`);
  }
  return renderFn(ctx);
}
