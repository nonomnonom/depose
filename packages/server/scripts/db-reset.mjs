import { spawnSync } from "node:child_process";
import { Client } from "pg";
import "dotenv/config";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to reset a production database.");
  process.exit(1);
}

if (!process.argv.includes("--yes")) {
  console.error(
    "This drops every table in the public schema, including auth data.\n" +
      "Re-run with `pnpm db:reset --yes` to confirm.",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Set it in packages/server/.env.");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("DROP SCHEMA IF EXISTS public CASCADE");
  await client.query("CREATE SCHEMA public");
} finally {
  await client.end();
}

const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "drizzle-kit", "migrate"],
  { stdio: "inherit", shell: process.platform === "win32" },
);
if (result.status !== 0) process.exit(result.status ?? 1);

console.log("Database reset and migrations applied.");
