import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

process.env.MAIL_TRANSPORT = "file";
process.env.MAIL_DIRECTORY = resolve(__dirname, "../test-mail-output");
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/depose";

await import("dotenv/config");

const outputDir = process.env.MAIL_DIRECTORY || resolve(__dirname, "../test-mail-output");

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const { NestFactory } = await import("@nestjs/core");
const { AppModule } = await import("../dist/app.module.js");
const { MailService } = await import("../dist/infrastructure/mail/send-mail.js");

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ["error"],
});

try {
  const mailService = app.get(MailService);
  await mailService.sendTemplate("reset-password", "user@example.com", "Reset your Depose password", {
    name: "Test User",
    url: "https://example.com/reset/abc123",
  });

  console.log("Mail sent; waiting for file output...");
  await new Promise((resolve) => setTimeout(resolve, 500));

  let files = [];
  if (existsSync(outputDir)) {
    const readdir = await import("node:fs").then((fs) => fs.promises.readdir(outputDir));
    files = readdir || [];
  }
  console.log("Output files:", files);

  if (files.length > 0) {
    const file = resolve(outputDir, files[0]);
    const content = readFileSync(file, "utf-8");
    console.log("File preview (first 1000 chars):");
    console.log(content.slice(0, 1000));
    console.log("SUCCESS: Mail infrastructure is working.");
  } else {
    console.warn("No mail files found in output directory.");
  }
} finally {
  await app.close();
}
