import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool } from './infrastructure/database/database.client.js';

/**
 * One-shot migration runner for containers and CI (`node dist/migrate.js`).
 * Migrations are idempotent; drizzle records applied versions in
 * `drizzle.__drizzle_migrations`.
 */
async function main(): Promise<void> {
  const logger = new Logger('Migrate');
  const db = drizzle(pool);
  try {
    await migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
    logger.log(JSON.stringify({ event: 'database.migrated' }));
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const logger = new Logger('Migrate');
  logger.error(
    `Migration failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
