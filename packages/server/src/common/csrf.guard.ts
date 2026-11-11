import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { appConfig } from '../config/app.config.js';
import { DomainError } from './domain-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Session mutations require an allowed Origin (spec 31). Browser clients always
 * send Origin for non-GET requests; non-browser clients that omit it are allowed.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const origin = request.headers.origin;
    if (!origin) return true;

    const allowed = new Set(appConfig.auth.trustedOrigins.map((value) => value.toLowerCase()));
    const host = request.headers.host;
    if (host) {
      allowed.add(`http://${host}`.toLowerCase());
      allowed.add(`https://${host}`.toLowerCase());
    }

    if (!allowed.has(origin.toLowerCase())) {
      throw DomainError.forbidden('Origin not allowed');
    }
    return true;
  }
}
