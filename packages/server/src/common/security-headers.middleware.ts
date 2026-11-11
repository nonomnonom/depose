import type { NextFunction, Request, Response } from 'express';
import { appConfig } from '../config/app.config.js';

/**
 * Minimal security headers for a JSON API. Applied before routing so error
 * responses carry them too. Deliberately no CSP: the Swagger UI at /api/docs is
 * served from the same origin, and a CSP that suits it would be noise here.
 */
export function securityHeaders(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  );
  response.setHeader('Cache-Control', 'no-store');

  const forwardedProto = request.headers['x-forwarded-proto'];
  const secureRequest =
    request.secure || (typeof forwardedProto === 'string' && forwardedProto.includes('https'));
  if (appConfig.isProduction || secureRequest) {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}
