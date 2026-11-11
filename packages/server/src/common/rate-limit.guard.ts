import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { DomainError } from './domain-error.js';
import {
  DEFAULT_RATE_LIMIT,
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from './rate-limit.decorator.js';
import { RateLimitService } from './rate-limit.service.js';

export function clientIp(request: Request): string {
  return request.ip || request.socket.remoteAddress || 'unknown';
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimitService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? DEFAULT_RATE_LIMIT;

    if (options.limit <= 0) return true;

    const request = ctx.switchToHttp().getRequest<Request>();
    const response = ctx.switchToHttp().getResponse<Response>();
    if (request.method === 'OPTIONS') return true;

    const scope =
      options.scope ?? `${request.method}:${request.route?.path ?? request.path}`;
    const result = await this.limiter.hit(
      `${scope}:${clientIp(request)}`,
      options.limit,
      options.windowSeconds * 1_000,
    );

    response.setHeader('X-RateLimit-Limit', String(options.limit));
    response.setHeader('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1_000));
      response.setHeader('Retry-After', String(retryAfterSeconds));
      throw new DomainError(
        'RATE_LIMITED',
        429,
        `Too many requests. Try again in ${retryAfterSeconds}s.`,
      );
    }
    return true;
  }
}
