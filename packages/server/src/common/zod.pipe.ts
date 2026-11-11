import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { DomainError } from './domain-error.js';

export class ZodBodyPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw DomainError.validation(
        'Validation failed',
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }
    return parsed.data;
  }
}

export function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw DomainError.validation(
      'Validation failed',
      parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || 'input',
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}
