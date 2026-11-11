import { GenericContainer } from 'testcontainers';

type StartedRedis = Awaited<ReturnType<GenericContainer['start']>>;

let container: StartedRedis | undefined;

/**
 * BullMQ needs a reachable Redis during app boot. A container keeps the E2E run
 * independent from whatever dev stack happens to be listening on 6379.
 */
export async function setupTestRedis(): Promise<string> {
  container = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  const url = `redis://${container.getHost()}:${container.getMappedPort(6379)}`;
  process.env.REDIS_URL = url;
  return url;
}

export async function teardownTestRedis(): Promise<void> {
  if (!container) return;
  await container.stop();
  container = undefined;
}
