import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, type ErrorCode, type ErrorDetail } from './domain-error.js';
import { RequestContextService } from './request-context.service.js';

interface ErrorEnvelope {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details: ErrorDetail[];
  requestId: string;
}

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'VALIDATION_ERROR',
  415: 'VALIDATION_ERROR',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  502: 'AI_OUTPUT_INVALID',
  503: 'AI_PROVIDER_UNAVAILABLE',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly context: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = this.context.get()?.requestId ?? '';
    let envelope: ErrorEnvelope;

    if (exception instanceof DomainError) {
      envelope = {
        statusCode: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
        requestId,
      };
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const rawMessage =
        typeof raw === 'string'
          ? raw
          : typeof raw === 'object' && raw !== null && 'message' in raw
            ? (raw as { message: string | string[] }).message
            : exception.message;
      envelope = {
        statusCode: status,
        code: CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR',
        message: Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage,
        details: [],
        requestId,
      };
    } else {
      const cause =
        exception instanceof Error && exception.cause instanceof Error
          ? ` cause=${exception.cause.message}`
          : '';
      this.logger.error(
        `Unhandled error requestId=${requestId}${cause}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      envelope = {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: [],
        requestId,
      };
    }

    if (envelope.statusCode >= 500) {
      this.logger.error(`requestId=${requestId} ${envelope.code}: ${envelope.message}`);
    }

    response.status(envelope.statusCode).json(envelope);
  }
}
