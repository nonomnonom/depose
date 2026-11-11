export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_STATE_TRANSITION'
  | 'MEMBER_ALREADY_EXISTS'
  | 'TENANT_NOT_FOUND'
  | 'DOMAIN_CONFLICT'
  | 'DOMAIN_NOT_VERIFIED'
  | 'DOMAIN_LIMIT_REACHED'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'
  | 'AI_PROVIDER_NOT_CONFIGURED'
  | 'AI_MODEL_NOT_ALLOWED'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_OUTPUT_INVALID';

export interface ErrorDetail {
  path: string;
  message: string;
}

export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    readonly details: ErrorDetail[] = [],
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'DomainError';
  }

  static unauthorized(message = 'Authentication required'): DomainError {
    return new DomainError('UNAUTHORIZED', 401, message);
  }

  static forbidden(message = 'You do not have access to this resource'): DomainError {
    return new DomainError('FORBIDDEN', 403, message);
  }

  static notFound(message = 'Resource not found'): DomainError {
    return new DomainError('NOT_FOUND', 404, message);
  }

  static tenantNotFound(): DomainError {
    return new DomainError('TENANT_NOT_FOUND', 404, 'Tenant not found for this host');
  }

  static conflict(code: ErrorCode, message: string): DomainError {
    return new DomainError(code, 409, message);
  }

  static validation(message: string, details: ErrorDetail[] = []): DomainError {
    return new DomainError('VALIDATION_ERROR', 400, message, details);
  }

  static invalidTransition(from: string, to: string): DomainError {
    return new DomainError(
      'INVALID_STATE_TRANSITION',
      409,
      `Cannot change status from ${from} to ${to}`,
    );
  }
}
