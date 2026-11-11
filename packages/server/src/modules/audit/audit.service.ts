import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { auditEvents } from '../../infrastructure/database/schema/index.js';
import type { ActorContext } from '../../common/request-context.service.js';

export interface AuditInput {
  firmId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  actor?: Pick<ActorContext, 'userId' | 'role'> | null;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async log(input: AuditInput): Promise<void> {
    await this.db.insert(auditEvents).values({
      firmId: input.firmId,
      actorType: input.actor ? 'user' : 'system',
      actorId: input.actor?.userId ?? 'system',
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata ?? {},
      ip: input.ip,
      userAgent: input.userAgent,
    });
  }
}
