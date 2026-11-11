import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { DomainError } from '../../common/domain-error.js';
import { appConfig } from '../../config/app.config.js';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

@Injectable()
export class McpTokenGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const token = appConfig.mcp.token;
    if (!token) throw DomainError.notFound('MCP endpoint is not enabled');

    const request = ctx.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const provided = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (!provided || !safeEqual(provided, token)) {
      throw DomainError.unauthorized('Invalid MCP token');
    }
    return true;
  }
}
