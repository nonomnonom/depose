import { z } from 'zod';

export const updateUserPreferencesSchema = z
  .object({
    locale: z.enum(['en', 'id']).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    density: z.enum(['compact', 'comfortable', 'spacious']).optional(),
    notifications: z
      .object({
        email: z.boolean().optional(),
        inApp: z.boolean().optional(),
        digest: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((data) => {
    const hasAny = Object.values(data).some((v) => v !== undefined);
    return hasAny;
  }, 'At least one preference field must be provided');

export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>;
