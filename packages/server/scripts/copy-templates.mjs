import { cpSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, "../src/infrastructure/mail/templates");
const destDir = resolve(__dirname, "../dist/infrastructure/mail/templates");

if (existsSync(srcDir)) {
  cpSync(srcDir, destDir, { recursive: true, force: true });
}
