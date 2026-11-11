import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { apiKeys } from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class ApiKeysService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: FirmActor) {
    this.policy.assertFirm(actor, 'api_key.read');
    const rows = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.firmId, actor.firmId), isNull(apiKeys.revokedAt)))
      .orderBy(desc(apiKeys.createdAt));
    return { items: rows.map((r) => this.keyDto(r)) };
  }

  async create(actor: FirmActor, input: { name: string; scopes?: string[] }) {
    this.policy.assertFirm(actor, 'firm.api_key.manage');
    const id = randomUUID();
    const rawKey = randomUUID() + '-' + randomUUID();
    const prefix = rawKey.slice(0, 8);
    const [key] = await this.db
      .insert(apiKeys)
      .values({
        id,
        firmId: actor.firmId,
        name: input.name.trim(),
        prefix,
        secretHash: this.hashKey(rawKey),
        scopes: input.scopes ?? [],
        createdBy: actor.userId,
      })
      .returning();
    await this.audit.log({
      firmId: actor.firmId,
      action: 'api_key.created',
      resourceType: 'api_key',
      resourceId: key.id,
      actor,
      metadata: { name: key.name, scopes: key.scopes },
    });
    return {
      key: {
        ...this.keyDto(key),
        rawKey, // only returned once at creation time
      },
    };
  }

  async revoke(actor: FirmActor, keyId: string) {
    this.policy.assertFirm(actor, 'firm.api_key.manage');
    const [key] = await this.db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.firmId, actor.firmId)))
      .returning();
    if (!key) throw DomainError.notFound('API key not found');
    await this.audit.log({
      firmId: actor.firmId,
      action: 'api_key.revoked',
      resourceType: 'api_key',
      resourceId: keyId,
      actor,
    });
    return { key: this.keyDto(key) };
  }

  async validate(rawKey: string) {
    const hash = this.hashKey(rawKey);
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.secretHash, hash),
          isNull(apiKeys.revokedAt),
        ),
      )
      .limit(1);
    if (!key) return null;
    return {
      id: key.id,
      firmId: key.firmId,
      name: key.name,
      scopes: key.scopes,
    };
  }

  private hashKey(key: string): string {
    return Buffer.from(key).toString('base64');
  }

  private keyDto(row: typeof apiKeys.$inferSelect) {
    return {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      scopes: row.scopes,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
