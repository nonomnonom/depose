/**
 * Polls until `until(value)` is true. The deterministic replacement for
 * `sleep` in tests: fails fast with the last observed value instead of
 * guessing a timeout length.
 */
export async function eventually<T>(
  read: () => Promise<T>,
  until: (value: T) => boolean,
  { timeoutMs = 5_000, intervalMs = 50 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T | undefined;

  while (Date.now() < deadline) {
    last = await read();
    if (until(last as T)) return last as T;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Condition not met within ${timeoutMs} ms. Last value: ${JSON.stringify(last)}`,
  );
}
