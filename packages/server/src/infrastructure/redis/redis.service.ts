import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { appConfig } from '../../config/app.config.js';

/**
 * Small shared Redis client for rate limiting and readiness checks. BullMQ uses
 * its own connections; this one is lazy so an unreachable Redis does not stop
 * the HTTP API from booting (requests degrade to in-process state instead).
 */
@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private unavailableUntil = 0;

  get configured(): boolean {
    return Boolean(appConfig.redisUrl);
  }

  get available(): boolean {
    return Date.now() > this.unavailableUntil;
  }

  async get(): Promise<Redis | null> {
    if (!this.configured || !this.available) return null;
    if (!this.client) {
      this.client = new Redis(appConfig.redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 1_000,
        retryStrategy: () => 5_000,
      });
      this.client.on('error', (error: Error) => {
        this.logger.warn(`Redis error: ${error.message}`);
      });
    }
    if (this.client.status === 'wait') {
      try {
        await this.client.connect();
      } catch (error) {
        this.markUnavailable(error);
        return null;
      }
    }
    if (this.client.status !== 'ready') {
      this.markUnavailable(new Error(`Redis status ${this.client.status}`));
      return null;
    }
    return this.client;
  }

  async ping(): Promise<boolean> {
    const client = await this.get();
    if (!client) return false;
    try {
      return (await client.ping()) === 'PONG';
    } catch (error) {
      this.markUnavailable(error);
      return false;
    }
  }

  markUnavailable(error: unknown): void {
    this.unavailableUntil = Date.now() + 60_000;
    this.logger.warn(
      `Redis unavailable, using in-process fallback for 60s: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.client) return;
    this.client.disconnect();
    this.client = null;
  }
}
