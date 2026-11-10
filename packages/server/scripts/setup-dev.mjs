import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log("Created .env from .env.example.");
  console.log("Set DATABASE_URL (and auth/LLM keys as needed), then run `pnpm setup` again.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Set it in packages/server/.env.");
  process.exit(1);
}

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
run(pnpm, ["exec", "drizzle-kit", "migrate"]);
console.log("Database is up to date. Start the server with `pnpm dev`.");
