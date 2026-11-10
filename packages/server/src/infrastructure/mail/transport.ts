import { FileMailTransport, SmtpTransport } from "@nestjs/mail";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { appConfig } from "../../config/app.config.js";

export function createMailTransport() {
  if (appConfig.mail.transport === "smtp" && appConfig.smtp) {
    return new SmtpTransport({
      host: appConfig.smtp.host,
      port: appConfig.smtp.port,
      auth: appConfig.smtp.user
        ? { user: appConfig.smtp.user, pass: appConfig.smtp.pass ?? "" }
        : undefined,
    });
  }

  const dir = resolve(process.cwd(), appConfig.mail.directory);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return new FileMailTransport({ directory: dir });
}
