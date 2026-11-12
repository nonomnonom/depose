import { expect } from '@jest/globals';

/**
 * Bridge for assertions written against `node:assert/strict` while the suite
 * runs on Jest. It keeps the existing assertions meaningful: every method maps
 * to a Jest matcher, and an optional message is preserved in the failure.
 */
type Message = string | undefined;

function withMessage(run: () => void, message: Message): void {
  try {
    run();
  } catch (error) {
    if (message && error instanceof Error) {
      error.message = `${message}\n${error.message}`;
    }
    throw error;
  }
}

const assert = {
  equal(actual: unknown, expected: unknown, message?: Message): void {
    withMessage(() => expect(actual).toBe(expected), message);
  },

  notEqual(actual: unknown, expected: unknown, message?: Message): void {
    withMessage(() => expect(actual).not.toBe(expected), message);
  },

  deepEqual(actual: unknown, expected: unknown, message?: Message): void {
    withMessage(() => expect(actual).toEqual(expected), message);
  },

  ok(value: unknown, message?: Message): void {
    withMessage(() => expect(value).toBeTruthy(), message);
  },

  match(value: string, pattern: RegExp, message?: Message): void {
    withMessage(() => expect(value).toMatch(pattern), message);
  },

  async rejects(
    fn: () => Promise<unknown>,
    expected?:
      | ((error: { status?: number; code?: string }) => boolean)
      | { message?: RegExp },
    message?: Message,
  ): Promise<void> {
    let failure: unknown;
    try {
      await fn();
    } catch (error) {
      failure = error;
    }

    if (failure === undefined) {
      throw new Error(message ?? 'Expected the promise to reject');
    }

    if (typeof expected === 'function') {
      if (!expected(failure as { status?: number; code?: string })) {
        throw new Error(
          message ?? `Rejected with an unexpected error: ${String(failure)}`,
        );
      }
      return;
    }

    if (expected?.message) {
      const actual = failure instanceof Error ? failure.message : String(failure);
      if (!expected.message.test(actual)) {
        throw new Error(
          message ?? `Expected rejection message to match ${expected.message}`,
        );
      }
    }
  },
};

export default assert;
