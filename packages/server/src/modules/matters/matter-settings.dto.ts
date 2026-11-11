import { z } from 'zod';

export const updateMatterSettingsSchema = z
  .object({
    processing: z
      .object({
        autoExtract: z.boolean().optional(),
        autoTranscribe: z.boolean().optional(),
        ocrMode: z.enum(['auto', 'force', 'off']).optional(),
      })
      .strict()
      .optional(),
    ai: z
      .object({
        model: z.string().trim().min(1).optional().nullable(),
        reasoningEffort: z.enum(['fast', 'balanced', 'thorough']).optional().nullable(),
        instructions: z.string().trim().max(10000).optional().nullable(),
      })
      .strict()
      .optional(),
    timezone: z.string().trim().min(1).max(64).nullable().optional(),
  })
  .strict()
  .refine((data) => {
    const hasAny = Object.values(data).some((v) => v !== undefined);
    return hasAny;
  }, 'At least one setting field must be provided');

export type UpdateMatterSettingsInput = z.infer<typeof updateMatterSettingsSchema>;
