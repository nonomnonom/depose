import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import { resolve } from 'node:path';

type StartedPostgres = Awaited<ReturnType<PostgreSqlContainer['start']>>;

let container: StartedPostgres | undefined;
let connectionString: string | undefined;

/**
 * Starts a throwaway Postgres, points `DATABASE_URL` at it, and applies every
 * migration in `drizzle/`. Call this after `applyTestEnv()` and before the app
 * is imported: `database.client.ts` builds its pool from the env at import time.
 */
export async function setupTestDatabase(): Promise<string> {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('depose_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  connectionString = container.getConnectionUri();
  process.env.DATABASE_URL = connectionString;
  await migrateTestDatabase();
  return connectionString;
}

export function testDatabaseUrl(): string {
  if (!connectionString) {
    throw new Error('setupTestDatabase() has not run yet');
  }
  return connectionString;
}

export async function migrateTestDatabase(): Promise<void> {
  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    await migrate(drizzle(client), {
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });
  } finally {
    await client.end();
  }
}

/** Empties every table in `public` so a spec can start from a known state. */
export async function resetTestDatabase(): Promise<void> {
  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `select tablename from pg_tables
        where schemaname = 'public' and tablename <> '__drizzle_migrations'`,
    );
    if (rows.length === 0) return;
    const tables = rows.map((row) => `"public"."${row.tablename}"`).join(', ');
    await client.query(`truncate table ${tables} restart identity cascade`);
  } finally {
    await client.end();
  }
}

export async function teardownTestDatabase(): Promise<void> {
  if (!container) return;
  await container.stop();
  container = undefined;
  connectionString = undefined;
}
