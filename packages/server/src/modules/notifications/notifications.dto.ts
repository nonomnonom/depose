import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
  cursor: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
