import { DocumentBuilder } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from './error.model.js';
import { SESSION_SECURITY_NAME } from './session-auth.decorator.js';

const DESCRIPTION = [
  'Depose self-hosted API. All domain endpoints live under `/api/v1`; health lives at `/api/health`.',
  '',
  '## Authentication',
  'Browser clients use the Better Auth session cookie. Mutations additionally require the `X-CSRF-Token` header or a trusted origin.',
  '',
  '## Errors',
  'Failures return `{ statusCode, code, message, details, requestId }`, where `code` comes from the registry in spec 31 and `requestId` matches the `X-Request-Id` response header.',
  '',
  '## Lists',
  'Collections are cursor paginated: `{ items, nextCursor, hasMore, warnings }`. Pass `cursor` and `limit` (max 100) to page.',
  '',
  '## Tenancy',
  'Requests are resolved by hostname. Use the subdomain of your firm or a verified custom domain.',
].join('\n');

export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setOpenAPIVersion('3.1.0')
    .setTitle('Depose API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0.0')
    .addServer('https://{host}', 'Firm host', {
      host: {
        default: 'localhost:3000',
        description: 'Firm subdomain or verified custom domain',
      },
    })
    .addTag('Health', 'Liveness probes, outside the versioned API')
    .addTag('Tenancy', 'Host resolution for the current firm')
    .addTag('Identity', 'The signed-in user and their permissions')
    .addTag('Firm', 'Firm setup, settings, and domains')
    .addTag('Matters', 'Matter records')
    .addTag('Onboarding', 'First-run checklist state')
    .addCookieAuth(
      'depose.session_token',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'depose.session_token',
        description:
          'Depose session cookie. In production the browser prefixes it with `__Secure-`.',
      },
      SESSION_SECURITY_NAME,
    )
    .addGlobalResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorEnvelopeDto,
    })
    .build();
}
