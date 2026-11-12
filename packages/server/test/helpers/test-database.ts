import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parse as parseEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import { resolve } from 'node:path';

/**
 * E2E database setup against the Postgres that is already running for local
 * development (see `packages/docker/docker-compose.yml`). Every spec file gets
 * its own database, so parallel files cannot see each other's rows and a test
 * run never truncates the development database.
 *
 * Set `TEST_DATABASE_ADMIN_URL` to point at another server. It must be a URL
 * for a user allowed to create databases. Set `TEST_DATABASE_URL` instead to
 * use an existing database as-is (CI with a provisioned database); it is
 * migrated but never dropped.
 */

const DEFAULT_ADMIN_URL = 'postgres://depose:depose@127.0.0.1:5432/postgres';
const DATABASE_PREFIX = 'depose_e2e_';
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

let databaseName: string | undefined;
let connectionString: string | undefined;
let adminUrl: string | undefined;
let ownsDatabase = false;

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/* The development credentials live in the server `.env`; read only the
 * database URL so the rest of the test environment stays fully controlled. */
function envFileDatabaseUrl(): string | undefined {
  try {
    return parseEnv(readFileSync(resolve(process.cwd(), '.env'))).DATABASE_URL;
  } catch {
    return undefined;
  }
}

function resolveAdminUrl(): string {
  const configured =
    process.env.TEST_DATABASE_ADMIN_URL ??
    process.env.DATABASE_URL ??
    envFileDatabaseUrl() ??
    DEFAULT_ADMIN_URL;
  const parsed = new URL(configured);
  parsed.pathname = '/postgres';
  return parsed.toString();
}

async function dropDatabase(admin: Client, name: string): Promise<void> {
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } catch {
    /* A leftover database is inconvenient, not a failed test. */
  }
}

/**
 * Databases from runs that were killed before teardown would otherwise pile up
 * forever. The name starts with a timestamp, so old ones can be identified
 * without asking Postgres for creation times.
 */
async function dropStaleDatabases(admin: Client): Promise<void> {
  const { rows } = await admin.query<{ datname: string }>(
    `select datname from pg_database where datname like $1`,
    [`${DATABASE_PREFIX}%`],
  );
  for (const row of rows) {
    const timestamp = Number(row.datname.slice(DATABASE_PREFIX.length).split('_')[0]);
    if (Number.isFinite(timestamp) && Date.now() - timestamp > STALE_AFTER_MS) {
      await dropDatabase(admin, row.datname);
    }
  }
}

export async function setupTestDatabase(): Promise<string> {
  if (process.env.TEST_DATABASE_URL) {
    connectionString = process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = connectionString;
    ownsDatabase = false;
    await migrateTestDatabase();
    return connectionString;
  }

  adminUrl = resolveAdminUrl();
  const admin = new Client({ connectionString: adminUrl });
  try {
    await admin.connect();
  } catch (error) {
    await admin.end().catch(() => undefined);
    throw new Error(
      `Cannot reach Postgres at ${new URL(adminUrl).host}. Start the development stack ` +
        `(docker compose -f packages/docker/docker-compose.yml up -d db redis) or set ` +
        `TEST_DATABASE_ADMIN_URL to a server that allows creating databases.`,
      { cause: error },
    );
  }

  try {
    await dropStaleDatabases(admin);
    databaseName = `${DATABASE_PREFIX}${Date.now()}_${randomBytes(4).toString('hex')}`;
    await admin.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await admin.end();
  }

  connectionString = withDatabase(adminUrl, databaseName);
  process.env.DATABASE_URL = connectionString;
  ownsDatabase = true;
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
  const name = databaseName;
  const admin = adminUrl;
  databaseName = undefined;
  connectionString = undefined;
  adminUrl = undefined;
  if (!ownsDatabase || !name || !admin) return;
  ownsDatabase = false;

  const client = new Client({ connectionString: admin });
  try {
    await client.connect();
    await dropDatabase(client, name);
  } finally {
    await client.end().catch(() => undefined);
  }
}
