import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { apiKeys } from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';
import { READ_ONLY_ACTIONS, isAction } from '../access-control/permissions.js';

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
    const requested = input.scopes?.length ? input.scopes : READ_ONLY_ACTIONS;
    const unknown = requested.filter((scope) => !isAction(scope));
    if (unknown.length > 0) {
      throw DomainError.validation('Unknown API key scope', [
        { path: 'scopes', message: unknown.join(', ') },
      ]);
    }
    const scopes = [...new Set(requested)];

    const id = randomUUID();
    const rawKey = `dp_${randomBytes(32).toString('base64url')}`;
    const prefix = rawKey.slice(0, 11);
    const [key] = await this.db
      .insert(apiKeys)
      .values({
        id,
        firmId: actor.firmId,
        name: input.name.trim(),
        prefix,
        secretHash: this.hashKey(rawKey),
        scopes,
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
    if (!rawKey.startsWith('dp_') || rawKey.length < 20) return null;
    const hash = this.hashKey(rawKey);
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.secretHash, hash), isNull(apiKeys.revokedAt)))
      .limit(1);
    if (!key) return null;

    /* Touch last-used without blocking the request on a write. */
    void this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, key.id))
      .catch(() => undefined);

    return {
      id: key.id,
      firmId: key.firmId,
      name: key.name,
      scopes: key.scopes,
    };
  }

  /**
   * Keys are 256-bit random values, so a plain SHA-256 digest is sufficient and
   * non-reversible. Never store the key or a reversible encoding of it.
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
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
