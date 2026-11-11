import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { ActorContext } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { firms } from '../../infrastructure/database/schema/index.js';
import { AuditService } from '../audit/audit.service.js';
import {
  DEFAULT_FIRM_SETTINGS,
  firmSettingsSchema,
  type FirmSettings,
  SETTINGS_ERROR_CODES,
} from '../settings/settings.schema.js';

@Injectable()
export class FirmSettingsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async get(firmId: string): Promise<FirmSettings> {
    const [firm] = await this.db
      .select({ settings: firms.settings })
      .from(firms)
      .where(eq(firms.id, firmId))
      .limit(1);

    if (!firm) {
      throw DomainError.notFound('Firm not found');
    }

    const raw = (firm.settings ?? {}) as Record<string, unknown>;
    const parsed = firmSettingsSchema.safeParse(raw);

    if (!parsed.success) {
      throw DomainError.validation(
        SETTINGS_ERROR_CODES.SCHEMA_INVALID,
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'settings',
          message: issue.message,
        })),
      );
    }

    return this.mergeWithDefaults(parsed.data);
  }

  async update(
    firmId: string,
    patch: Record<string, unknown>,
    actor: ActorContext,
  ): Promise<FirmSettings> {
    const current = await this.get(firmId);
    const merged = this.deepMerge(current, patch);
    const parsed = firmSettingsSchema.safeParse(merged);

    if (!parsed.success) {
      throw DomainError.validation(
        SETTINGS_ERROR_CODES.SCHEMA_INVALID,
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'settings',
          message: issue.message,
        })),
      );
    }

    const validated = parsed.data as FirmSettings;

    if (validated.retention.auditDays !== undefined && validated.retention.auditDays < 30) {
      throw DomainError.validation(
        SETTINGS_ERROR_CODES.RETENTION_TOO_SHORT,
        [{ path: 'retention.auditDays', message: 'Audit retention must be at least 30 days' }],
      );
    }

    const [updated] = await this.db
      .update(firms)
      .set({ settings: validated, updatedAt: new Date() })
      .where(eq(firms.id, firmId))
      .returning();

    if (!updated) {
      throw DomainError.notFound('Firm not found');
    }

    await this.audit.log({
      firmId,
      action: 'firm.settings.updated',
      resourceType: 'firm',
      resourceId: firmId,
      actor,
      metadata: { fields: Object.keys(patch), schemaVersion: validated.schemaVersion },
    });

    return validated;
  }

  private mergeWithDefaults(parsed: FirmSettings): FirmSettings {
    return {
      schemaVersion: parsed.schemaVersion,
      ai: {
        model: parsed.ai.model ?? DEFAULT_FIRM_SETTINGS.ai.model,
        reasoningEffort: parsed.ai.reasoningEffort ?? DEFAULT_FIRM_SETTINGS.ai.reasoningEffort,
        crossMatterEnabled:
          parsed.ai.crossMatterEnabled ?? DEFAULT_FIRM_SETTINGS.ai.crossMatterEnabled,
        instructions: parsed.ai.instructions ?? DEFAULT_FIRM_SETTINGS.ai.instructions,
        externalProvidersEnabled:
          parsed.ai.externalProvidersEnabled ?? DEFAULT_FIRM_SETTINGS.ai.externalProvidersEnabled,
      },
      processing: {
        autoExtract: parsed.processing.autoExtract ?? DEFAULT_FIRM_SETTINGS.processing.autoExtract,
        autoTranscribe:
          parsed.processing.autoTranscribe ?? DEFAULT_FIRM_SETTINGS.processing.autoTranscribe,
        ocrMode: parsed.processing.ocrMode ?? DEFAULT_FIRM_SETTINGS.processing.ocrMode,
        redactEmailMetadata:
          parsed.processing.redactEmailMetadata ??
          DEFAULT_FIRM_SETTINGS.processing.redactEmailMetadata,
      },
      security: {
        matterVisibility:
          parsed.security.matterVisibility ?? DEFAULT_FIRM_SETTINGS.security.matterVisibility,
        guestAccessEnabled:
          parsed.security.guestAccessEnabled ?? DEFAULT_FIRM_SETTINGS.security.guestAccessEnabled,
        guestDocumentSharingEnabled:
          parsed.security.guestDocumentSharingEnabled ??
          DEFAULT_FIRM_SETTINGS.security.guestDocumentSharingEnabled,
      },
      mcp: {
        readOnly: parsed.mcp.readOnly ?? DEFAULT_FIRM_SETTINGS.mcp.readOnly,
      },
      retention: {
        documentsDays:
          parsed.retention.documentsDays ?? DEFAULT_FIRM_SETTINGS.retention.documentsDays,
        factsDays: parsed.retention.factsDays ?? DEFAULT_FIRM_SETTINGS.retention.factsDays,
        threadsDays: parsed.retention.threadsDays ?? DEFAULT_FIRM_SETTINGS.retention.threadsDays,
        auditDays: parsed.retention.auditDays ?? DEFAULT_FIRM_SETTINGS.retention.auditDays,
      },
      appearance: {
        theme: parsed.appearance.theme ?? DEFAULT_FIRM_SETTINGS.appearance.theme,
      },
      defaults: {
        language: parsed.defaults.language ?? DEFAULT_FIRM_SETTINGS.defaults.language,
        timezone: parsed.defaults.timezone ?? DEFAULT_FIRM_SETTINGS.defaults.timezone,
      },
      notifications:
        parsed.notifications ?? DEFAULT_FIRM_SETTINGS.notifications,
      flags: parsed.flags ?? DEFAULT_FIRM_SETTINGS.flags,
    };
  }

  private deepMerge(
    base: Record<string, unknown>,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        result[key] !== null &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = { ...(result[key] as Record<string, unknown>), ...(value as Record<string, unknown>) };
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
