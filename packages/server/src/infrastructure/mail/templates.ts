export type EmailTemplate = 'reset-password' | 'verify-email' | 'invitation' | 'welcome';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface TemplateContext {
  name?: string;
  firmName?: string;
  inviterName?: string;
  url: string;
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>${escapeHtml(title)}</title></head>
  <body style="margin:0;background:#f6f6f4;font-family:ui-sans-serif,system-ui,sans-serif;color:#1a1a18;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;">
          <tr><td>
            <p style="margin:0 0 24px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6b66;">Depose</p>
            <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
            ${body}
            <hr style="margin:28px 0 16px;border:none;border-top:1px solid #e6e6e2;" />
            <p style="margin:0;font-size:12px;color:#8a8a84;">Depose — fact intelligence for disputes.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const templates: Record<
  EmailTemplate,
  (ctx: TemplateContext) => { title: string; body: string; text: string }
> = {
  'reset-password': (ctx) => ({
    title: 'Reset your password',
    body: `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(ctx.name ?? 'there')}, use the button below to choose a new password. The link expires in one hour.</p>
      <p style="margin:0 0 24px;"><a href="${escapeHtml(ctx.url)}" style="display:inline-block;background:#1a1a18;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;">Reset password</a></p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6b66;">If you did not request this, you can ignore this email.</p>`,
    text: `Hi ${ctx.name ?? 'there'},\n\nReset your Depose password (link expires in one hour):\n${ctx.url}\n\nIf you did not request this, ignore this email.`,
  }),
  'verify-email': (ctx) => ({
    title: 'Verify your email',
    body: `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(ctx.name ?? 'there')}, confirm your email address to finish setting up Depose.</p>
      <p style="margin:0 0 24px;"><a href="${escapeHtml(ctx.url)}" style="display:inline-block;background:#1a1a18;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;">Verify email</a></p>`,
    text: `Hi ${ctx.name ?? 'there'},\n\nVerify your Depose email:\n${ctx.url}`,
  }),
  invitation: (ctx) => ({
    title: `Join ${ctx.firmName ?? 'your firm'} on Depose`,
    body: `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${escapeHtml(ctx.inviterName ?? 'An administrator')} invited you to ${escapeHtml(ctx.firmName ?? 'a firm')} on Depose. Accept the invitation to set your password and get access.</p>
      <p style="margin:0 0 24px;"><a href="${escapeHtml(ctx.url)}" style="display:inline-block;background:#1a1a18;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;">Accept invitation</a></p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6b66;">This link expires in 7 days.</p>`,
    text: `${ctx.inviterName ?? 'An administrator'} invited you to ${ctx.firmName ?? 'a firm'} on Depose.\n\nAccept invitation (expires in 7 days):\n${ctx.url}`,
  }),
  welcome: (ctx) => ({
    title: 'Welcome to Depose',
    body: `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(ctx.name ?? 'there')}, your account is ready.</p>
      <p style="margin:0 0 24px;"><a href="${escapeHtml(ctx.url)}" style="display:inline-block;background:#1a1a18;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;">Open Depose</a></p>`,
    text: `Hi ${ctx.name ?? 'there'},\n\nYour Depose account is ready:\n${ctx.url}`,
  }),
};

export function renderTemplate(
  template: EmailTemplate,
  ctx: TemplateContext,
): RenderedEmail {
  const rendered = templates[template](ctx);
  return {
    subject: rendered.title,
    html: layout(rendered.title, rendered.body),
    text: rendered.text,
  };
}
