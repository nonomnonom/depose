import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';
import { appConfig } from '../../config/app.config.js';
import { renderTemplate, type EmailTemplate } from './templates.js';

export interface MailContext {
  name?: string;
  firmName?: string;
  inviterName?: string;
  url: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport =
    appConfig.mail.transport === 'smtp' && appConfig.smtp
      ? nodemailer.createTransport({
          host: appConfig.smtp.host,
          port: appConfig.smtp.port,
          auth: appConfig.smtp.user
            ? { user: appConfig.smtp.user, pass: appConfig.smtp.pass ?? '' }
            : undefined,
        })
      : null;

  get isConfigured(): boolean {
    return this.transport !== null;
  }

  async sendTemplate(
    template: EmailTemplate,
    to: string,
    ctx: MailContext,
  ): Promise<void> {
    const { subject, html, text } = renderTemplate(template, ctx);

    if (!this.transport) {
      const dir = resolve(process.cwd(), appConfig.mail.directory);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const file = resolve(dir, `${randomUUID()}.eml`);
      writeFileSync(
        file,
        `To: ${to}\nFrom: ${appConfig.mail.from}\nSubject: ${subject}\nContent-Type: text/html; charset=utf-8\n\n${html}\n`,
        'utf8',
      );
      this.logger.log(`Email written to ${file}`);
      return;
    }

    await this.transport.sendMail({
      from: appConfig.mail.from,
      to,
      subject,
      html,
      text,
    });
  }
}
