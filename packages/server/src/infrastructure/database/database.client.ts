import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { appConfig } from "../../config/app.config.js";
import * as schema from "./schema.js";

export const pool = new Pool({ connectionString: appConfig.databaseUrl });

export const db = drizzle(pool, { schema });
