import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { matters } from '../../infrastructure/database/schema/index.js';
import { AuditService } from '../audit/audit.service.js';
import {
  DEFAULT_MATTER_SETTINGS,
  matterSettingsSchema,
  type MatterSettings,
  SETTINGS_ERROR_CODES,
} from '../settings/settings.schema.js';

@Injectable()
export class MatterSettingsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async get(actor: FirmActor, matterId: string): Promise<MatterSettings> {
    const [matter] = await this.db
      .select({ settings: matters.settings })
      .from(matters)
      .where(and(eq(matters.id, matterId), eq(matters.firmId, actor.firmId)))
      .limit(1);

    if (!matter) {
      throw DomainError.notFound('Matter not found');
    }

    const raw = (matter.settings ?? {}) as Record<string, unknown>;
    const parsed = matterSettingsSchema.safeParse(raw);

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
    actor: FirmActor,
    matterId: string,
    patch: Record<string, unknown>,
  ): Promise<MatterSettings> {
    const current = await this.get(actor, matterId);
    const merged = this.deepMerge(current, patch);
    const parsed = matterSettingsSchema.safeParse(merged);

    if (!parsed.success) {
      throw DomainError.validation(
        SETTINGS_ERROR_CODES.SCHEMA_INVALID,
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'settings',
          message: issue.message,
        })),
      );
    }

    const validated = parsed.data as MatterSettings;

    const [updated] = await this.db
      .update(matters)
      .set({ settings: validated, updatedAt: new Date() })
      .where(and(eq(matters.id, matterId), eq(matters.firmId, actor.firmId)))
      .returning();

    if (!updated) {
      throw DomainError.notFound('Matter not found');
    }

    await this.audit.log({
      firmId: actor.firmId,
      action: 'matter.settings.updated',
      resourceType: 'matter',
      resourceId: matterId,
      actor,
      metadata: { fields: Object.keys(patch), schemaVersion: validated.schemaVersion },
    });

    return validated;
  }

  private mergeWithDefaults(parsed: MatterSettings): MatterSettings {
    return {
      schemaVersion: parsed.schemaVersion ?? DEFAULT_MATTER_SETTINGS.schemaVersion,
      processing: {
        autoExtract:
          parsed.processing.autoExtract ?? DEFAULT_MATTER_SETTINGS.processing.autoExtract,
        autoTranscribe:
          parsed.processing.autoTranscribe ?? DEFAULT_MATTER_SETTINGS.processing.autoTranscribe,
        ocrMode: parsed.processing.ocrMode ?? DEFAULT_MATTER_SETTINGS.processing.ocrMode,
      },
      ai: {
        model: parsed.ai.model ?? DEFAULT_MATTER_SETTINGS.ai.model,
        reasoningEffort: parsed.ai.reasoningEffort ?? DEFAULT_MATTER_SETTINGS.ai.reasoningEffort,
        instructions: parsed.ai.instructions ?? DEFAULT_MATTER_SETTINGS.ai.instructions,
      },
      timezone: parsed.timezone ?? DEFAULT_MATTER_SETTINGS.timezone,
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
