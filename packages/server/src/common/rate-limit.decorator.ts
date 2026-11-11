import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'depose:rate-limit';

export interface RateLimitOptions {
  /** Maximum requests per window. */
  limit: number;
  /** Window size in seconds. */
  windowSeconds: number;
  /** Bucket name; defaults to method + route path. */
  scope?: string;
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Default bucket for every authenticated API route. Individual handlers can
 * tighten it with @RateLimit({...}).
 */
export const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  limit: 600,
  windowSeconds: 60,
};

/** Better Auth endpoints (sign-in, sign-up, reset) are brute-force targets. */
export const AUTH_RATE_LIMIT: RateLimitOptions = {
  limit: 60,
  windowSeconds: 60,
  scope: 'auth',
};
