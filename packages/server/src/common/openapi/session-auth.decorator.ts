import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from './error.model.js';

export const SESSION_SECURITY_NAME = 'session';

/**
 * Documents the session-cookie authentication that the global guards enforce
 * on every non-public endpoint.
 */
export function ApiSessionAuth(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiCookieAuth(SESSION_SECURITY_NAME),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorEnvelopeDto,
    }),
    ApiForbiddenResponse({
      description: 'Insufficient permission or firm setup required',
      type: ErrorEnvelopeDto,
    }),
  );
}
