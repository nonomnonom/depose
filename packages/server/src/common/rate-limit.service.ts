import { Injectable } from '@nestjs/common';
import { RedisService } from '../infrastructure/redis/redis.service.js';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  degraded: boolean;
}

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window limiter. Redis keeps limits correct across API replicas; if Redis
 * is unreachable the process falls back to an in-memory window instead of
 * failing requests outright.
 */
@Injectable()
export class RateLimitService {
  private readonly memory = new Map<string, Window>();

  constructor(private readonly redis: RedisService) {}

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const client = await this.redis.get();
    if (client) {
      try {
        const redisKey = `depose:rl:${key}`;
        const results = await client
          .multi()
          .incr(redisKey)
          .pttl(redisKey)
          .exec();
        const count = Number(results?.[0]?.[1] ?? 0);
        let ttl = Number(results?.[1]?.[1] ?? -1);
        if (ttl < 0) {
          await client.pexpire(redisKey, windowMs);
          ttl = windowMs;
        }
        return {
          allowed: count <= limit,
          remaining: Math.max(0, limit - count),
          resetAt: now + ttl,
          degraded: false,
        };
      } catch {
        this.redis.markUnavailable(new Error('rate limit command failed'));
      }
    }

    this.prune(now);
    const existing = this.memory.get(key);
    const window =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + windowMs };
    window.count += 1;
    this.memory.set(key, window);
    return {
      allowed: window.count <= limit,
      remaining: Math.max(0, limit - window.count),
      resetAt: window.resetAt,
      degraded: true,
    };
  }

  private prune(now: number): void {
    if (this.memory.size < 1_000) return;
    for (const [key, window] of this.memory) {
      if (window.resetAt <= now) this.memory.delete(key);
    }
  }
}
