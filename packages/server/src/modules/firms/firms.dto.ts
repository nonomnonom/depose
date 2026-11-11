import { z } from 'zod';

export const RESERVED_SLUGS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'auth',
  'mail',
  'status',
  'docs',
  'support',
  'billing',
  'cdn',
  'assets',
]);

export const slugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Use lowercase letters, numbers, and hyphens')
  .refine((value) => !RESERVED_SLUGS.has(value), 'This subdomain is reserved');

export const setupFirmSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    role: z.string().trim().max(80).optional(),
    primaryLanguage: z.enum(['id', 'en']).default('id'),
    jurisdiction: z.string().trim().min(2).max(8).default('ID'),
    timezone: z.string().trim().min(1).max(64).default('UTC'),
    slug: slugSchema.optional(),
  })
  .strict();

export type SetupFirmInput = z.infer<typeof setupFirmSchema>;

export const updateFirmSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    primaryLanguage: z.enum(['id', 'en']).optional(),
    jurisdiction: z.string().trim().min(2).max(8).optional(),
    defaultTimezone: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export type UpdateFirmInput = z.infer<typeof updateFirmSchema>;

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  if (base.length >= 3) return base;
  return `firm-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_FIRM_SETTINGS = {
  schemaVersion: 1,
  appearance: { theme: 'system' },
  ai: {
    model: null,
    reasoningEffort: null,
    externalProvidersEnabled: false,
    crossMatterEnabled: false,
    instructions: '',
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
  retention: { documentsDays: null, factsDays: null, threadsDays: null, auditDays: 365 },
  flags: {},
} as const;
