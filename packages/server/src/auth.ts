import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";

const db = new Kysely({
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
});

export const auth = betterAuth({
  database: db,
  plugins: [organization()],
});
