import { z } from 'zod';

/**
 * Canonical settings validation schemas (spec 06 — Settings & Precedence).
 * All settings are stored as jsonb with schemaVersion. Unknown keys are rejected.
 */

// --- Firm settings schema -------------------------------------------------

export const firmAiSettingsSchema = z
  .object({
    model: z.string().trim().min(1).optional().nullable(),
    reasoningEffort: z.enum(['fast', 'balanced', 'thorough']).optional().nullable(),
    crossMatterEnabled: z.boolean().default(false),
    instructions: z.string().trim().max(10000).default(''),
    externalProvidersEnabled: z.boolean().default(false),
  })
  .strict();

export const firmProcessingSettingsSchema = z
  .object({
    autoExtract: z.boolean().default(true),
    autoTranscribe: z.boolean().default(true),
    ocrMode: z.enum(['auto', 'force', 'off']).default('auto'),
    redactEmailMetadata: z.boolean().default(false),
  })
  .strict();

export const firmSecuritySettingsSchema = z
  .object({
    matterVisibility: z.enum(['assigned_only', 'all_firm']).default('assigned_only'),
    guestAccessEnabled: z.boolean().default(true),
    guestDocumentSharingEnabled: z.boolean().default(false),
  })
  .strict();

export const firmMcpSettingsSchema = z
  .object({
    readOnly: z.boolean().default(false),
  })
  .strict();

export const firmRetentionSettingsSchema = z
  .object({
    documentsDays: z.number().int().positive().nullable().optional(),
    factsDays: z.number().int().positive().nullable().optional(),
    threadsDays: z.number().int().positive().nullable().optional(),
    auditDays: z.number().int().positive().default(365),
  })
  .strict();

export const firmAppearanceSettingsSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
  })
  .strict();

export const firmSettingsSchema = z
  .object({
    schemaVersion: z.number().int().positive().default(1),
    ai: firmAiSettingsSchema.default({
      model: null,
      reasoningEffort: null,
      crossMatterEnabled: false,
      instructions: '',
      externalProvidersEnabled: false,
    }),
    processing: firmProcessingSettingsSchema.default({
      autoExtract: true,
      autoTranscribe: true,
      ocrMode: 'auto',
      redactEmailMetadata: false,
    }),
    security: firmSecuritySettingsSchema.default({
      matterVisibility: 'assigned_only',
      guestAccessEnabled: true,
      guestDocumentSharingEnabled: false,
    }),
    mcp: firmMcpSettingsSchema.default({ readOnly: false }),
    retention: firmRetentionSettingsSchema.default({
      documentsDays: null,
      factsDays: null,
      threadsDays: null,
      auditDays: 365,
    }),
    appearance: firmAppearanceSettingsSchema.default({ theme: 'system' }),
    defaults: z
      .object({
        language: z.enum(['en', 'id']).default('en'),
        timezone: z.string().trim().min(1).max(64).default('UTC'),
      })
      .strict()
      .default({ language: 'en', timezone: 'UTC' }),
    flags: z.record(z.string(), z.boolean()).default({}),

    notifications: z
      .object({
        email: z.boolean().default(true),
        inApp: z.boolean().default(true),
        digest: z.boolean().default(false),
      })
      .strict()
      .default({ email: true, inApp: true, digest: false }),
  })
  .strict();

export type FirmSettings = z.infer<typeof firmSettingsSchema>;

// --- Matter settings schema (overrides of firm settings) ------------------

export const matterProcessingSettingsSchema = z
  .object({
    autoExtract: z.boolean().optional(),
    autoTranscribe: z.boolean().optional(),
    ocrMode: z.enum(['auto', 'force', 'off']).optional(),
  })
  .strict();

export const matterAiSettingsSchema = z
  .object({
    model: z.string().trim().min(1).optional().nullable(),
    reasoningEffort: z.enum(['fast', 'balanced', 'thorough']).optional().nullable(),
    instructions: z.string().trim().max(10000).optional().nullable(),
  })
  .strict();

export const matterSettingsSchema = z
  .object({
    schemaVersion: z.number().int().positive().default(1),
    processing: matterProcessingSettingsSchema.default({}),
    ai: matterAiSettingsSchema.default({}),
    timezone: z.string().trim().min(1).max(64).optional().nullable(),
  })
  .strict();

export type MatterSettings = z.infer<typeof matterSettingsSchema>;

// --- User preferences schema ----------------------------------------------

export const userPreferencesSchema = z
  .object({
    locale: z.enum(['en', 'id']).default('en'),
    timezone: z.string().trim().min(1).max(64).default('UTC'),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    density: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable'),
    notifications: z
      .object({
        email: z.boolean().default(true),
        inApp: z.boolean().default(true),
        digest: z.boolean().default(false),
      })
      .strict()
      .default({ email: true, inApp: true, digest: false }),
  })
  .strict();

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// --- Precedence helpers (spec 06) -----------------------------------------

/**
 * Precedence order (lowest to highest):
 *   1. App defaults
 *   2. Env / config.yaml
 *   3. firms.settings
 *   4. matters.settings
 *   5. User preferences
 *
 * A higher level may not weaken a stricter security/retention setting.
 */

export const DEFAULT_FIRM_SETTINGS: FirmSettings = {
  schemaVersion: 1,
  ai: {
    model: null,
    reasoningEffort: null,
    crossMatterEnabled: false,
    instructions: '',
    externalProvidersEnabled: false,
  },
  processing: {
    autoExtract: true,
    autoTranscribe: true,
    ocrMode: 'auto',
    redactEmailMetadata: false,
  },
  security: {
    matterVisibility: 'assigned_only',
    guestAccessEnabled: true,
    guestDocumentSharingEnabled: false,
  },
  mcp: { readOnly: false },
  retention: {
    documentsDays: null,
    factsDays: null,
    threadsDays: null,
    auditDays: 365,
  },
  appearance: { theme: 'system' },
  defaults: { language: 'en', timezone: 'UTC' },
  flags: {},
  notifications: { email: true, inApp: true, digest: false },
};

export const DEFAULT_MATTER_SETTINGS: MatterSettings = {
  schemaVersion: 1,
  processing: {},
  ai: {},
  timezone: null,
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  locale: 'en',
  timezone: 'UTC',
  theme: 'system',
  density: 'comfortable',
  notifications: { email: true, inApp: true, digest: false },
};

export const SETTINGS_ERROR_CODES = {
  SCHEMA_INVALID: 'SETTINGS_SCHEMA_INVALID',
  VERSION_UNSUPPORTED: 'SETTINGS_VERSION_UNSUPPORTED',
  RETENTION_TOO_SHORT: 'SETTINGS_RETENTION_TOO_SHORT',
  CROSS_MATTER_FORBIDDEN: 'SETTINGS_CROSS_MATTER_FORBIDDEN',
  MODEL_NOT_ALLOWED: 'SETTINGS_MODEL_NOT_ALLOWED',
  FORMAT_UNSUPPORTED: 'SETTINGS_FORMAT_UNSUPPORTED',
} as const;
