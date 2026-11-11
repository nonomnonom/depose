import { z } from 'zod';
import { firmSettingsSchema, type FirmSettings } from '../settings/settings.schema.js';

export const updateFirmSettingsSchema = z
  .object({
    settings: z.record(z.string(), z.unknown()).optional(),
    ai: z
      .object({
        model: z.string().trim().min(1).optional().nullable(),
        reasoningEffort: z.enum(['fast', 'balanced', 'thorough']).optional().nullable(),
        crossMatterEnabled: z.boolean().optional(),
        instructions: z.string().trim().max(10000).optional().nullable(),
        externalProvidersEnabled: z.boolean().optional(),
      })
      .strict()
      .optional(),
    processing: z
      .object({
        autoExtract: z.boolean().optional(),
        autoTranscribe: z.boolean().optional(),
        ocrMode: z.enum(['auto', 'force', 'off']).optional(),
        redactEmailMetadata: z.boolean().optional(),
      })
      .strict()
      .optional(),
    security: z
      .object({
        matterVisibility: z.enum(['assigned_only', 'all_firm']).optional(),
        guestAccessEnabled: z.boolean().optional(),
        guestDocumentSharingEnabled: z.boolean().optional(),
      })
      .strict()
      .optional(),
    mcp: z.object({ readOnly: z.boolean().optional() }).strict().optional(),
    retention: z
      .object({
        documentsDays: z.number().int().positive().nullable().optional(),
        factsDays: z.number().int().positive().nullable().optional(),
        threadsDays: z.number().int().positive().nullable().optional(),
        auditDays: z.number().int().positive().optional(),
      })
      .strict()
      .optional(),
    appearance: z.object({ theme: z.enum(['light', 'dark', 'system']).optional() }).strict().optional(),
    defaults: z
      .object({
        language: z.enum(['en', 'id']).optional(),
        timezone: z.string().trim().min(1).max(64).optional(),
      })
      .strict()
      .optional(),
    flags: z.record(z.string(), z.boolean()).optional(),
  })
  .strict()
  .refine((data) => {
    const hasAny = Object.values(data).some((v) => v !== undefined);
    return hasAny;
  }, 'At least one setting field must be provided');

export type UpdateFirmSettingsInput = z.infer<typeof updateFirmSettingsSchema>;

export function firmSettingsToResponse(settings: FirmSettings) {
  return settings;
}
