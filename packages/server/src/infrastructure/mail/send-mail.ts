import { Injectable } from "@nestjs/common";
import { Mailer, type MailSendOptions } from "@nestjs/mail";
import { renderTemplate } from "./render.js";

@Injectable()
export class MailService {
  constructor(private readonly mailer: Mailer) {}

  async send(data: MailSendOptions): Promise<void> {
    await this.mailer.send(data);
  }

  async sendTemplate(
    name: string,
    to: string,
    subject: string,
    ctx: Record<string, unknown>,
  ): Promise<void> {
    const html = await renderTemplate(name as Parameters<typeof renderTemplate>[0], ctx);
    await this.mailer.send({
      to,
      subject,
      html,
    });
  }
}
