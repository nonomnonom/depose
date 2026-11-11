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
        code: status === 404 ? 'NOT_FOUND' : status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR',
        message: Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage,
        details: [],
        requestId,
      };
    } else {
      this.logger.error(
        `Unhandled error requestId=${requestId}`,
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
