import { Redis } from 'ioredis';

/**
 * E2E Redis setup against the Redis that is already running for local
 * development. Each spec process takes its own logical database (1-15) so
 * parallel files never share queues and development data in database 0 is
 * never touched. The selected database is flushed before and after the spec.
 *
 * Set `TEST_REDIS_URL` to use a specific server/database instead; it is then
 * used exactly as given and is not flushed on teardown.
 */

const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6379';

let url: string | undefined;
let flushOnTeardown = false;

function isolatedUrl(): string {
  const base = process.env.TEST_REDIS_URL ?? process.env.REDIS_URL ?? DEFAULT_REDIS_URL;
  const parsed = new URL(base);
  /* 16 logical databases by default; keep 0 free for development. */
  parsed.pathname = `/${(process.pid % 15) + 1}`;
  return parsed.toString();
}

async function connect(target: string): Promise<Redis> {
  const client = new Redis(target, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  await client.connect();
  return client;
}

export async function setupTestRedis(): Promise<string> {
  url = process.env.TEST_REDIS_URL ?? isolatedUrl();
  flushOnTeardown = !process.env.TEST_REDIS_URL;

  const client = await connect(url).catch((error: unknown) => {
    throw new Error(
      `Cannot reach Redis at ${new URL(url as string).host}. Start the development ` +
        `stack (docker compose -f packages/docker/docker-compose.yml up -d db redis) ` +
        `or set TEST_REDIS_URL.`,
      { cause: error },
    );
  });
  try {
    await client.flushdb();
  } finally {
    client.disconnect();
  }

  process.env.REDIS_URL = url;
  return url;
}

export async function teardownTestRedis(): Promise<void> {
  const target = url;
  url = undefined;
  if (!target || !flushOnTeardown) return;
  flushOnTeardown = false;

  const client = new Redis(target, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  try {
    await client.connect();
    await client.flushdb();
  } catch {
    /* Redis being gone at teardown does not change the test result. */
  } finally {
    client.disconnect();
  }
}
